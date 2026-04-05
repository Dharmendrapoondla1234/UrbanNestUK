# Git Setup — PropAI UK + CRM

Follow these exact steps to push to GitHub without any warnings.

---

## Step 1 — Remove node_modules if already staged

If you already ran `git add .` and see CRLF warnings, fix it now:

```bash
# Remove node_modules from git tracking (keeps files on disk)
git rm -r --cached frontend/node_modules 2>/dev/null || true
git rm -r --cached crm/frontend/node_modules 2>/dev/null || true

# Remove any other accidentally staged files
git rm -r --cached data/ 2>/dev/null || true
```

---

## Step 2 — Initial clean commit

```bash
cd uk-realestate

# Init git (skip if already done)
git init

# Apply line-ending rules FIRST before adding files
git config core.autocrlf false
git config core.eol lf

# Stage everything — .gitignore will exclude node_modules automatically
git add .

# Verify node_modules is NOT staged (should return nothing)
git status | grep node_modules

# Commit
git commit -m "feat: PropAI UK + CRM platform v3"
```

---

## Step 3 — Add GitHub remote and push

```bash
git remote add origin https://github.com/YOUR_USERNAME/propai-uk.git
git branch -M main
git push -u origin main
```

---

## Step 4 — Install dependencies AFTER cloning

On a fresh clone, install node packages:

```bash
# PropAI frontend
cd frontend && npm install && cd ..

# CRM frontend
cd crm/frontend && npm install && cd ../..

# PropAI backend
pip install -r backend/requirements.txt

# CRM backend
pip install -r crm/backend/requirements.txt
```

---

## Why the CRLF warnings happened

You ran `git add .` **before** `npm install` created `node_modules/`, OR you staged `node_modules/` before `.gitignore` was in place.

The root `.gitignore` now contains:
```
node_modules/
```

And `.gitattributes` enforces `eol=lf` for all text files, so Windows Git won't try to convert line endings.

---

## Verify .gitignore is working

```bash
# Should NOT list node_modules
git status --short | grep node_modules
# (empty output = good)

# Check what WILL be committed
git status --short
```

Expected output — only your source files:
```
A  .gitattributes
A  .gitignore
A  README.md
A  DEPLOYMENT.md
A  render.yaml
A  backend/api/main.py
A  backend/ml/predictor.py
...
A  frontend/src/pages/Dashboard.jsx
...
A  crm/frontend/src/App.jsx
...
```
