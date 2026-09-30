/**
 * Native VS Code OutputChannel for Jules session activities and logs.
 * @module ui/activity_channel
 * @description Provides a pure native IDE log streaming experience, replacing HTML timeline views.
 */

import * as vscode from 'vscode';
import { getActivitiesApi } from '../client/jules_api';

/**
 * Singleton managing the native Jules Activity Stream Output Channel.
 */
export class JulesActivityChannel {
  private static instance: JulesActivityChannel;
  private channel: vscode.OutputChannel;

  private constructor() {
    this.channel = vscode.window.createOutputChannel('Jules Activity Stream');
  }

  /**
   * Retrieves the singleton instance of the JulesActivityChannel.
   * @returns The active channel controller instance.
   */
  public static getInstance(): JulesActivityChannel {
    if (!JulesActivityChannel.instance) {
      JulesActivityChannel.instance = new JulesActivityChannel();
    }
    return JulesActivityChannel.instance;
  }

  /**
   * Appends a raw string line to the output channel.
   * @param line - Text line to append.
   */
  public appendLine(line: string): void {
    this.channel.appendLine(line);
  }

  /**
   * Shows the output channel in the VS Code Panel.
   * @param preserveFocus - Whether to keep focus in the current editor.
   */
  public show(preserveFocus: boolean = true): void {
    this.channel.show(preserveFocus);
  }

  /**
   * Clears the output channel content.
   */
  public clear(): void {
    this.channel.clear();
  }

  /**
   * Formats a cloud activity object into a structured human-readable terminal log line.
   * @param activity - Raw activity payload from Google Jules REST API.
   * @returns Formatted log line with timestamp and metadata tags.
   */
  public formatActivity(activity: any): string {
    const time = activity.createTime
      ? new Date(activity.createTime).toLocaleTimeString()
      : new Date().toLocaleTimeString();

    const origin = activity.originator === 'USER' ? 'USER' : 'AGENT';
    const lines: string[] = [];

    if (activity.planGenerated?.plan?.steps) {
      const steps = activity.planGenerated.plan.steps;
      lines.push(`[${time}] [${origin}] [PLAN_GENERATED] Proposed execution plan with ${steps.length} step(s):`);
      steps.forEach((s: any, idx: number) => {
        lines.push(`   ${idx + 1}. ${s.title || 'Untitled Step'}`);
        if (s.description) lines.push(`      ${s.description}`);
      });
      return lines.join('\n');
    }

    if (activity.progressUpdated) {
      const title = activity.progressUpdated.title || 'Step update';
      const desc = activity.progressUpdated.description ? ` - ${activity.progressUpdated.description}` : '';
      return `[${time}] [${origin}] [PROGRESS] ${title}${desc}`;
    }

    if (activity.userMessage) {
      const text = typeof activity.userMessage === 'string' ? activity.userMessage : (activity.userMessage.text || '');
      return `[${time}] [USER] [MESSAGE] ${text}`;
    }

    if (activity.agentMessage) {
      const text = typeof activity.agentMessage === 'string' ? activity.agentMessage : (activity.agentMessage.text || '');
      return `[${time}] [AGENT] [MESSAGE] ${text}`;
    }

    if (activity.artifacts) {
      for (const art of activity.artifacts) {
        if (art.bashOutput) {
          lines.push(`[${time}] [BASH] $ ${art.bashOutput.command || 'bash'}`);
          if (art.bashOutput.stdout) {
            lines.push(art.bashOutput.stdout.trimEnd());
          }
          return lines.join('\n');
        }
        if (art.changeSet?.gitPatch?.suggestedCommitMessage) {
          return `[${time}] [CHANGESET] Patch ready: ${art.changeSet.gitPatch.suggestedCommitMessage}`;
        }
      }
    }

    if (activity.description) {
      return `[${time}] [${origin}] ${activity.description}`;
    }

    return `[${time}] [${origin}] Activity updated`;
  }

  /**
   * Appends an individual activity record into the stream.
   * @param sessionId - Session identifier.
   * @param activity - Activity record.
   */
  public appendActivity(sessionId: string, activity: any): void {
    const formatted = this.formatActivity(activity);
    this.channel.appendLine(formatted);
  }

  /**
   * Fetches and streams all activities for a session into the native OutputChannel.
   * @param sessionId - Target session ID.
   * @param targetDir - Optional root workspace directory.
   */
  public async streamSessionActivities(sessionId: string, targetDir?: string): Promise<void> {
    this.channel.show(true);
    this.channel.appendLine(`\n=== [Jules Activity Stream: Session #${sessionId}] ===`);
    try {
      const activities = await getActivitiesApi(sessionId, targetDir);
      if (!activities || activities.length === 0) {
        this.channel.appendLine('[INFO] No activities recorded yet for this session.');
        return;
      }
      for (const act of activities) {
        this.appendActivity(sessionId, act);
      }
    } catch (err: any) {
      this.channel.appendLine(`[ERROR] Failed to fetch activities: ${err.message}`);
    }
  }

  /**
   * Disposes the underlying output channel resource.
   */
  public dispose(): void {
    this.channel.dispose();
  }
}
