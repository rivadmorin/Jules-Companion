
## 2024-05-18 - Keep the Repo Clean
**Discovery:** My PR was partially rejected because I committed temporary scripts (patch_client.sh, replace_auto.js, etc.) used to perform the string replacements.
**Analysis:** The repository must be kept clean, and only intentional source code changes should be submitted. Temporary tools used for generation or search-and-replace are execution artifacts.
**Action:** Always run `rm -f <temp files>` and ensure the workspace is completely clean of execution tools before requesting review or submitting.
