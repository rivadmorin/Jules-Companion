import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import {
  parseDiffFiles,
  JulesDiffContentProvider,
  JULES_DIFF_SCHEME,
  getOriginalUri,
  getProposedUri,
  getUnifiedDiffUri
} from '../scripts/ui/visual_diff';
import * as vscode from 'vscode';

describe('Visual Diff Parser Unit Tests', () => {
  const samplePatch = `diff --git a/src/math.ts b/src/math.ts
index 1234567..89abcdef 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,4 +1,5 @@
 export function add(a: number, b: number): number {
-  return a - b;
+  // Fixed addition bug
+  return a + b;
 }
diff --git a/docs/readme.md b/docs/readme.md
new file mode 100644
--- /dev/null
+++ b/docs/readme.md
@@ -0,0 +1,2 @@
+# New Feature
+Documentation added.
`;

  test('should handle empty or whitespace patch cleanly', () => {
    assert.deepStrictEqual(parseDiffFiles(''), []);
    assert.deepStrictEqual(parseDiffFiles('   \n  '), []);
  });

  test('should parse multiple files and reconstruct before/after lines with stats', () => {
    const parsed = parseDiffFiles(samplePatch);
    assert.strictEqual(parsed.length, 2);

    // File 1: src/math.ts
    const f1 = parsed[0];
    assert.strictEqual(f1.file, 'src/math.ts');
    assert.ok(f1.before.includes('return a - b;'));
    assert.ok(!f1.before.includes('Fixed addition bug'));
    assert.ok(f1.after.includes('return a + b;'));
    assert.ok(f1.after.includes('Fixed addition bug'));
    assert.strictEqual(f1.additions, 2);
    assert.strictEqual(f1.deletions, 1);

    // File 2: docs/readme.md
    const f2 = parsed[1];
    assert.strictEqual(f2.file, 'docs/readme.md');
    assert.strictEqual(f2.before, '');
    assert.ok(f2.after.includes('# New Feature'));
    assert.strictEqual(f2.additions, 2);
    assert.strictEqual(f2.deletions, 0);
  });

  test('should parse diff with Windows CRLF (\\r\\n) line endings cleanly', () => {
    const crlfPatch = samplePatch.replace(/\n/g, '\r\n');
    const parsed = parseDiffFiles(crlfPatch);
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].file, 'src/math.ts');
    assert.ok(parsed[0].before.includes('return a - b;'));
    assert.ok(parsed[0].after.includes('return a + b;'));
    assert.strictEqual(parsed[1].file, 'docs/readme.md');
    assert.ok(parsed[1].after.includes('# New Feature'));
  });
});

describe('JulesDiffContentProvider Unit Tests', () => {
  test('should generate properly formatted virtual document URIs', () => {
    const sessionId = 'test-session-123';
    const filePath = 'src/components/Button.tsx';

    const origUri = getOriginalUri(sessionId, filePath);
    assert.ok(origUri.toString().startsWith(`${JULES_DIFF_SCHEME}://`));
    assert.ok(origUri.toString().includes('original'));
    assert.ok(origUri.toString().includes('Button.tsx'));

    const propUri = getProposedUri(sessionId, filePath);
    assert.ok(propUri.toString().startsWith(`${JULES_DIFF_SCHEME}://`));
    assert.ok(propUri.toString().includes('proposed'));
    assert.ok(propUri.toString().includes('Button.tsx'));

    const patchUri = getUnifiedDiffUri(sessionId);
    assert.ok(patchUri.toString().endsWith('patch.diff'));
  });

  test('should store, retrieve, and serve virtual document content in memory', () => {
    const provider = JulesDiffContentProvider.getInstance();
    const uri = vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/session-abc/original/file.txt`);
    const content = 'Hello world from virtual diff memory';

    provider.setContent(uri, content);
    assert.strictEqual(provider.getContent(uri), content);
    assert.strictEqual(provider.provideTextDocumentContent(uri), content);

    // Non-existent URI should return empty string
    const emptyUri = vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/session-abc/notfound.txt`);
    assert.strictEqual(provider.provideTextDocumentContent(emptyUri), '');
  });

  test('clearSession should purge all virtual document buffers for target session', () => {
    const provider = JulesDiffContentProvider.getInstance();
    const uri1 = vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/session-purge-1/orig.ts`);
    const uri2 = vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/session-purge-1/prop.ts`);
    const uriOther = vscode.Uri.parse(`${JULES_DIFF_SCHEME}://sessions/session-keep/prop.ts`);

    provider.setContent(uri1, 'code 1');
    provider.setContent(uri2, 'code 2');
    provider.setContent(uriOther, 'keep me');

    provider.clearSession('session-purge-1');

    assert.strictEqual(provider.provideTextDocumentContent(uri1), '');
    assert.strictEqual(provider.provideTextDocumentContent(uri2), '');
    assert.strictEqual(provider.provideTextDocumentContent(uriOther), 'keep me');
  });
});
