# 🧠 DEVELOPMENT OPERATING SYSTEM (Claude + VS Code)

## 🎯 CORE PRINCIPLES
- Always prioritize correctness over speed
- Simplicity > cleverness
- Small, reversible changes only
- Never assume — always verify
- Fix root causes, not symptoms
- Code should be readable, testable, and maintainable

---

## 📌 PHASE 1: UNDERSTAND & PLAN

1. Deeply understand the problem before coding
   - Clarify requirements
   - Identify constraints and edge cases
   - Ask questions if anything is unclear

2. Explore the codebase
   - Locate relevant files
   - Understand architecture and data flow
   - Identify dependencies and side effects

3. Create `projectplan.md`
   - Problem summary
   - Root cause analysis (if bug)
   - Proposed solution
   - Risks and assumptions

4. Break into TODOs
   - Small, atomic, testable steps
   - Each task should be independently verifiable

---

## 🛠 PHASE 2: IMPLEMENTATION

5. Execute tasks one by one
   - Mark TODOs as complete as you go
   - Keep changes minimal and localized

6. Code standards
   - Follow existing project patterns
   - Use clear naming (no vague variables)
   - Avoid unnecessary abstractions
   - Prefer explicit over implicit logic

7. Before writing code
   - Check if solution already exists in project
   - Reuse instead of reinvent

---

## 🧪 PHASE 3: VALIDATION

8. After each change:
   - Verify functionality works as expected
   - Check for regressions
   - Test edge cases

9. Add/update tests when possible
   - Unit tests for logic
   - Integration tests for flows

10. Debugging rules
   - Reproduce the issue first
   - Identify root cause
   - Fix at source (NOT patch/fix-over)

---

## 🔍 PHASE 4: REVIEW & HARDENING

11. Perform self-review:
   - Is this the simplest solution?
   - Is there duplicated logic?
   - Any hidden bugs or edge cases?

12. Code quality checklist:
   - Readability ✅
   - Maintainability ✅
   - Performance (reasonable, not premature) ✅
   - Error handling ✅

13. Security & safety checks:
   - Input validation
   - Avoid hardcoded secrets
   - Proper error handling

---

## 📝 PHASE 5: DOCUMENTATION

14. Update `projectplan.md`:
   - Completed TODOs
   - Summary of changes
   - Design decisions
   - Known limitations
   - Future improvements

15. Add inline comments ONLY where necessary
   - Explain WHY, not WHAT

---

## 📢 COMMUNICATION STYLE

16. At every step, provide:
   - High-level explanation of changes
   - Reason for decisions
   - What was improved

17. Avoid:
   - Overly long explanations
   - Unnecessary technical jargon

---

## 🚨 STRICT RULES

- ❌ NO temporary fixes
- ❌ NO unnecessary refactoring
- ❌ NO large unplanned changes
- ❌ NO assumptions without verification

- ✅ ALWAYS fix root cause
- ✅ ALWAYS keep changes minimal
- ✅ ALWAYS validate before moving forward

---

## ⚡ ADVANCED (USE WHEN NEEDED)

### Refactoring Mode
- Only refactor if:
  - It reduces complexity significantly
  - It removes duplication
  - It improves maintainability

### Performance Mode
- Only optimize when:
  - There is a proven bottleneck
  - Measured, not guessed

### Debug Mode
- Log strategically
- Trace data flow
- Compare expected vs actual behavior

---

## 🔌 OPTIONAL ADD-ONS (HIGHLY RECOMMENDED)

### 🌐 Web Apps / APIs
- Validate all API inputs
- Handle all HTTP status codes properly
- Ensure idempotency where needed

### 🤖 ESP32 / IoT Projects
- Handle network failures gracefully
- Avoid blocking delays
- Use non-blocking timers (millis instead of delay)
- Ensure memory efficiency

### 🧩 Full-Stack Projects
- Separate frontend and backend concerns
- Ensure API contracts are consistent
- Validate data on both client and server

---

## 🏁 FINAL GOAL

Deliver code that is:
- Correct
- Clean
- Minimal
- Maintainable
- Production-ready


