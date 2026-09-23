# Security

- Passwords are hashed with bcrypt.
- API auth uses JWT bearer tokens.
- Role-based access control protects admin and operator routes.
- Secrets live only in environment variables.
- The frontend never receives API keys.
- External calls have deterministic fallbacks.
