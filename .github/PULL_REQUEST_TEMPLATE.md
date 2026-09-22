## Summary

<!-- What does this change do, and why? -->

## Related issue

<!-- e.g. Closes #123 -->

## Phase

<!--
StackLoop is delivered in sequential phases. Which phase deliverable does this advance?
See docs/phase-tracker.md. If this is not part of the current phase, explain why it belongs now.
-->

## How this was verified

<!--
Commands run, tests added, and their results. Request/response traces or screenshots where
relevant. "It builds" is not verification.
-->

## Checklist

- [ ] The change is scoped to a single concern and the diff is easy to review
- [ ] New or changed behavior is covered by tests, including failure paths and not only the happy path
- [ ] New endpoints validate their input and enforce auth/authorization
- [ ] No secrets, tokens, or credentials are hardcoded; new config is read from environment variables
- [ ] `.env.example` is updated if new environment variables were introduced
- [ ] Documentation is updated if setup, behavior, or API contracts changed
- [ ] Mocks and stubs introduced here are either temporary by agreement or tracked in the phase tracker

## Notes for reviewers

<!-- Anything reviewers should focus on, known limitations, or planned follow-up work. -->
