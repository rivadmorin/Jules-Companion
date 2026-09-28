import { test, describe } from 'node:test';
import * as assert from 'node:assert';
import { parseDiffFiles } from '../scripts/ui/visual_diff';

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

  test('should parse multiple files and reconstruct before/after lines', () => {
    const parsed = parseDiffFiles(samplePatch);
    assert.strictEqual(parsed.length, 2);

    // File 1: src/math.ts
    const f1 = parsed[0];
    assert.strictEqual(f1.file, 'src/math.ts');
    assert.ok(f1.before.includes('return a - b;'));
    assert.ok(!f1.before.includes('Fixed addition bug'));
    assert.ok(f1.after.includes('return a + b;'));
    assert.ok(f1.after.includes('Fixed addition bug'));

    // File 2: docs/readme.md
    const f2 = parsed[1];
    assert.strictEqual(f2.file, 'docs/readme.md');
    assert.strictEqual(f2.before, '');
    assert.ok(f2.after.includes('# New Feature'));
  });
});
