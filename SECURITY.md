# Security Policy

## Supported Versions

The StackLoop project is currently in active development. Security updates are provided for the latest development branch and the most recent stable release line.

At this time, the following support policy applies:

- The latest main branch is supported for security fixes.
- The latest tagged release is supported for security fixes.
- Older versions may not receive security updates unless explicitly announced.

If you are unsure whether a version is still supported, please contact the maintainers.

## Reporting a Vulnerability

If you discover a security vulnerability in StackLoop, please report it privately and responsibly.

Do not open a public GitHub issue for security concerns. Please use the designated private reporting channel instead.

### Report Details

When reporting a vulnerability, please include:

- A clear description of the issue
- Steps to reproduce the vulnerability
- The affected component or service
- Potential impact
- Any suggested mitigation or fix
- Your contact information for follow-up

## Responsible Disclosure Process

We ask security reporters to:

- Refrain from publicly disclosing the issue until it has been investigated and remediated
- Avoid accessing or modifying data beyond what is necessary to validate the vulnerability
- Allow maintainers sufficient time to assess and address the report
- Work cooperatively with the project team to resolve the issue safely

## Security Response Timeline

We will make every reasonable effort to respond to security reports promptly.

Expected timeline:

- Initial acknowledgment: within 3 business days
- Preliminary assessment: within 7 business days
- Status update: as the investigation progresses
- Remediation or mitigation: dependent on severity and complexity

We will keep reporters informed throughout the process and will provide an update once the issue is resolved or a public disclosure is scheduled.

## Scope

This policy applies to vulnerabilities affecting:

- The StackLoop web application
- The backend services
- The AI service
- Authentication and authorization flows
- Data handling and storage logic
- Deployment and infrastructure configurations maintained by the project

The following are generally out of scope unless they indicate a direct security issue in the project:

- Issues already known and publicly disclosed
- Social engineering attacks against project maintainers or community members
- Denial-of-service attacks that require unrealistic resource levels
- Vulnerabilities in third-party services not directly controlled by StackLoop

## Dependency Management

StackLoop uses a range of dependencies and infrastructure components. The project maintainers will review and update dependencies regularly to reduce security exposure.

Contributors and maintainers should:

- Keep dependencies up to date where practical
- Review security advisories for libraries and tools in use
- Use trusted package sources and verified container images
- Avoid introducing unnecessary third-party dependencies

## Security Best Practices

To help keep the project secure, contributors should:

- Use secure authentication practices
- Avoid committing secrets, API keys, or credentials
- Validate and sanitize user input
- Follow least-privilege principles in code and deployment configuration
- Keep environment variables and configuration secrets out of source control
- Report suspicious behavior or unexpected exposure immediately

## Contact Information

Please contact the StackLoop maintainers at:

- Email: me@aryankr.in

If you are not sure which contact method to use, open a private report through the project’s designated security reporting channel and the maintainers will follow up.

## Public Disclosure Policy

We prefer coordinated disclosure. Security issues will be made public only after:

- The vulnerability has been investigated
- A fix or mitigation has been implemented
- The maintainers have determined that public disclosure is appropriate

This approach helps protect users while allowing the community to benefit from timely remediation.

## Hall of Fame

We appreciate responsible security researchers and contributors who help improve StackLoop’s security posture. Recognition will be provided at the maintainers’ discretion.
