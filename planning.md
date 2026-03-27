# PR Comments Planning

| Comment | Action | Explanation |
|---------|--------|-------------|
| Why is the API list needed in README? | Keep as is | The API list helps developers quickly see available endpoints without diving into code. It's a common practice in API docs for quick reference. |
| In src/user/user.repository.ts: async create - no await needed? | No change | The `create` method is synchronous in TypeORM, so no await is needed. It's correct as is. |
| In src/user/user.controller.ts: space before if | Fix | Add a blank line before `if` for better readability and consistency with code style. |
| In user.test.ts: test names shouldn't include status codes | Change | Remove status codes from test names to make them more descriptive and less brittle. |
| In project.test.ts: should we use const for error messages? | Consider | Using constants for error messages could improve maintainability, but for now, keep inline since messages are simple and not reused extensively. |
| In job.repository.ts: variable reassignment is weird | Change | Refactor to avoid reassigning the same variable; use a more readable approach. |
| In job.controller.ts: delete comment | Fix | Remove the inline comment as it's redundant with the code. |
| In job.repository.ts: better to fetch all skills in one query and create only missing ones | Change | Optimize by fetching existing skills in one query, then creating only missing ones to reduce DB calls. |