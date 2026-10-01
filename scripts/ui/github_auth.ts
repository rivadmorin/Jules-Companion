/**
 * GitHub Authentication Manager for Jules Companion VS Code Extension.
 * @module ui/github_auth
 * @description Manages native VS Code GitHub OAuth sessions and account state.
 */

import * as vscode from 'vscode';
import { getGhCliToken, getGitHubUserInfo, GitHubUserInfo } from '../core/github';

/**
 * Static manager for GitHub OAuth authentication and token resolution.
 */
export class GitHubAuthManager {
  private static readonly SCOPES = ['repo', 'read:user'];
  private static cachedToken: string | undefined;
  private static cachedUser: GitHubUserInfo | undefined;
  private static listenerRegistered = false;

  /**
   * Initializes session change listener to automatically invalidate caches on auth change.
   */
  private static ensureSessionListener(): void {
    if (this.listenerRegistered) return;
    this.listenerRegistered = true;

    if (vscode.authentication?.onDidChangeSessions) {
      vscode.authentication.onDidChangeSessions((event: any) => {
        if (event?.provider?.id === 'github') {
          GitHubAuthManager.clearCache();
        }
      });
    }
  }

  /**
   * Retrieves active VS Code GitHub authentication session.
   *
   * @param createIfNone - Prompts the user to sign in if no session exists.
   * @returns Active AuthenticationSession or undefined.
   */
  static async getSession(createIfNone: boolean = false): Promise<vscode.AuthenticationSession | undefined> {
    this.ensureSessionListener();
    try {
      if (!vscode.authentication?.getSession) {
        return undefined;
      }
      const session = await vscode.authentication.getSession('github', this.SCOPES, { createIfNone });
      if (session) {
        this.cachedToken = session.accessToken;
        if (session.account?.label) {
          this.cachedUser = { login: session.account.label };
        }
      }
      return session;
    } catch {
      return undefined;
    }
  }

  /**
   * Initiates interactive GitHub OAuth sign-in flow.
   *
   * @returns Access token string if sign-in succeeds, undefined otherwise.
   */
  static async signIn(): Promise<string | undefined> {
    this.clearCache();
    const session = await this.getSession(true);
    if (session) {
      const username = session.account?.label || 'developer';
      vscode.window.showInformationMessage(`🎉 Signed in to GitHub as @${username}`);
      return session.accessToken;
    }
    return undefined;
  }

  /**
   * Clears cached session credentials and informs the user.
   */
  static async signOut(): Promise<void> {
    this.clearCache();
    vscode.window.showInformationMessage('Signed out from Jules GitHub session cache.');
  }

  /**
   * Resolves the best available GitHub token:
   * 1. Cached VS Code OAuth session token
   * 2. Active VS Code GitHub session
   * 3. Local gh CLI auth token fallback
   *
   * @returns Token string or undefined.
   */
  static async getToken(): Promise<string | undefined> {
    if (this.cachedToken) return this.cachedToken;

    const session = await this.getSession(false);
    if (session?.accessToken) {
      this.cachedToken = session.accessToken;
      return this.cachedToken;
    }

    // Fallback: check GitHub CLI token
    const cliToken = getGhCliToken();
    if (cliToken) {
      this.cachedToken = cliToken;
      return this.cachedToken;
    }

    return undefined;
  }

  /**
   * Resolves the authenticated GitHub user profile.
   *
   * @returns GitHubUserInfo object or null if unauthenticated.
   */
  static async getUser(): Promise<GitHubUserInfo | null> {
    if (this.cachedUser) return this.cachedUser;

    const session = await this.getSession(false);
    if (session?.account?.label) {
      this.cachedUser = { login: session.account.label };
      return this.cachedUser;
    }

    const token = await this.getToken();
    if (token) {
      const info = await getGitHubUserInfo(token);
      if (info) {
        this.cachedUser = info;
        return this.cachedUser;
      }
    }

    return null;
  }

  /**
   * Checks whether GitHub authentication is currently active.
   *
   * @returns True if a valid token is available.
   */
  static async isSignedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  /**
   * Clears all in-memory auth caches.
   */
  static clearCache(): void {
    this.cachedToken = undefined;
    this.cachedUser = undefined;
  }
}
