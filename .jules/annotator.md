## 2024-05-24 - Language Consistency in Documentation
**Discovery:** The main project documentation (README, /docs) is in Indonesian, but existing inline code comments and block documentation (JSDoc) are written in English.
**Analysis:** Maintaining a consistent language for internal code documentation is crucial for developer experience and future maintainability. Mixing languages in code comments can cause confusion.
**Action:** Always write new JSDoc, PyDoc, and inline comments in English, regardless of the language used in the user-facing documentation files. Ensure all Python eval scripts receive proper PyDoc block comments, as they are currently lacking them.
