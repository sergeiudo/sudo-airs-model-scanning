# Contributing to Prisma AIRS Model Security Demo

First off, thank you for considering contributing to this project! Community contributions help make this demonstration more useful for everyone.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

When creating a bug report, include:

- **Clear title** - Descriptive and specific
- **Steps to reproduce** - Detailed steps to reproduce the issue
- **Expected behavior** - What you expected to happen
- **Actual behavior** - What actually happened
- **Environment details:**
  - Python version (`python --version`)
  - SDK version (`pip show model-security-client`)
  - Operating System
  - Relevant configuration

**Example:**
```
Title: ValidationError on HuggingFace URL with correct format

Steps to Reproduce:
1. Set credentials in environment
2. Run: client.scan(model_uri="https://huggingface.co/microsoft/DialoGPT-medium")
3. Error occurs

Expected: Scan completes successfully
Actual: ValidationError thrown

Environment:
- Python 3.12.1
- model-security-client 1.0.5
- macOS 14.0
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please:

1. **Check existing feature requests** first
2. **Provide clear use case** - Why is this enhancement needed?
3. **Describe the solution** - How should it work?
4. **Consider alternatives** - What other approaches did you consider?

### Pull Requests

#### Before You Start

1. **Open an issue** first to discuss major changes
2. **Check existing PRs** to avoid duplication
3. **Fork the repository** and create a feature branch

#### Development Setup

```bash
# Clone the repository
git clone https://github.com/sergeiudo/sudo-airs-model-scanning.git
cd sudo-airs-model-scanning

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install black flake8 pytest mypy
```

#### Coding Standards

**Python Style:**
- Follow [PEP 8](https://pep8.org/)
- Use [Black](https://black.readthedocs.io/) for formatting
- Maximum line length: 88 characters
- Use type hints where possible

**Format your code:**
```bash
# Format with Black
black .

# Check with flake8
flake8 .

# Type check with mypy
mypy .
```

**Naming Conventions:**
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_CASE`
- Private methods: `_leading_underscore`

#### Notebook Contributions

When contributing Jupyter notebooks:

1. **Clear all outputs** before committing:
   ```bash
   jupyter nbconvert --clear-output --inplace notebooks/*.ipynb
   ```

2. **Never include credentials** in notebooks

3. **Add markdown explanations** for complex code cells

4. **Test the notebook** from top to bottom with "Restart & Run All"

5. **Use consistent formatting:**
   - Brief markdown headers
   - Clean code cells
   - Proper variable names

#### Commit Messages

Write clear, descriptive commit messages:

```bash
# Good
git commit -m "Add batch scanning example to notebook"
git commit -m "Fix ValidationError on HuggingFace URLs"
git commit -m "Update requirements.txt with latest SDK version"

# Bad
git commit -m "fix bug"
git commit -m "updates"
git commit -m "wip"
```

**Format:**
```
Short summary (50 chars or less)

More detailed explanation if needed. Wrap at 72 characters.
Explain the problem this commit solves and why this approach
was chosen over alternatives.

- Bullet points are okay
- Use present tense: "Add feature" not "Added feature"
- Reference issues: "Fixes #123" or "Related to #456"
```

#### Pull Request Process

1. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following coding standards

3. **Test your changes:**
   ```bash
   # Run example scripts
   python examples/list_security_groups.py
   python examples/scan_huggingface_model.py

   # Test notebook (if modified)
   jupyter notebook
   # Run all cells and verify outputs
   ```

4. **Commit with clear messages**

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open Pull Request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Screenshots (if applicable)
   - Reference to related issues

7. **Respond to feedback** - Be open to suggestions

#### PR Checklist

Before submitting, ensure:

- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] New code has appropriate documentation
- [ ] Notebook outputs are cleared (if applicable)
- [ ] No credentials or sensitive data included
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains the changes
- [ ] Related issues are referenced

### Documentation Improvements

Documentation contributions are highly valued!

**Areas to improve:**
- README clarity and completeness
- Code comments and docstrings
- Example scripts
- Troubleshooting guides
- Setup instructions

**Documentation style:**
- Clear and concise
- Include code examples
- Use markdown formatting
- Test all instructions

### First-Time Contributors

New to open source? Great starting points:

- Fix typos or improve documentation
- Add code comments
- Create additional examples
- Improve error messages
- Update dependencies

Look for issues labeled `good-first-issue` or `documentation`.

## Project Structure

```
sudo-airs-model-scanning/
├── notebooks/           # Jupyter notebook demos
│   ├── model_security_demo.ipynb
│   └── README.md
├── examples/            # Python example scripts
│   ├── list_security_groups.py
│   └── scan_huggingface_model.py
├── requirements.txt     # Dependencies
├── README.md            # Main documentation
├── SECURITY.md          # Security policy
├── CONTRIBUTING.md      # This file
├── CODE_OF_CONDUCT.md   # Code of conduct
└── LICENSE              # MIT License
```

## Style Guide

### Python

```python
# Good
def scan_model(model_uri: str, security_group_uuid: UUID) -> ScanResult:
    """
    Scan a model for security vulnerabilities.

    Args:
        model_uri: HuggingFace model URL
        security_group_uuid: Security group to use

    Returns:
        Scan result object

    Raises:
        ValidationError: If model URI format is invalid
    """
    client = ModelSecurityAPIClient()
    return client.scan(
        security_group_uuid=security_group_uuid,
        model_uri=model_uri
    )

# Bad
def scan(m,s):  # Unclear variable names, no type hints, no docstring
    c = ModelSecurityAPIClient()
    return c.scan(s,m)
```

### Markdown

```markdown
# Use clear headers

## Subsections are H2

### Sub-subsections are H3

- Use bullet lists for unordered items
- Keep items parallel in structure
- Be consistent with punctuation

1. Use numbered lists for sequential steps
2. Each step should be actionable
3. Test instructions before committing

**Bold** for emphasis, *italics* for technical terms.

`Code` in backticks for inline code.

\```python
# Code blocks with language specified
print("Hello World")
\```
```

## Testing

### Manual Testing

Test your changes:

1. **Create fresh virtual environment:**
   ```bash
   python3 -m venv test-venv
   source test-venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run example scripts:**
   ```bash
   python examples/list_security_groups.py
   python examples/scan_huggingface_model.py
   ```

3. **Test notebooks:**
   - Open in Jupyter
   - Kernel → Restart & Run All
   - Verify no errors

### Automated Testing

(Future: Add pytest tests)

```bash
pytest tests/
```

## Getting Help

Need assistance?

- **GitHub Issues:** Ask questions in issues
- **Documentation:** Check README and SECURITY.md
- **Community:** Join discussions

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes for significant contributions
- README acknowledgments section

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! Your efforts help make ML security more accessible to everyone.
