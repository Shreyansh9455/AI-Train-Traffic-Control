# 🚀 How to Upload this Project to GitHub

Your project is packaged and ready for GitHub! We have prepared:
1. **[AI-Train-Traffic-Control.zip](file:///d:/AI%20Train%20Traffic%20Control/AI-Train-Traffic-Control.zip)** — A clean, production-ready archive containing all code, configurations, and documentation (excluding heavy `node_modules` and sensitive credentials).
2. **[.gitignore](file:///d:/AI%20Train%20Traffic%20Control/.gitignore)** — Pre-configured to prevent sensitive `.env` files and builds from leaking to GitHub.
3. **[package.json](file:///d:/AI%20Train%20Traffic%20Control/package.json)** — Root workspace scripts for convenient one-click installation and execution.

---

## Step 1: Create a New Repository on GitHub

1. Open your browser and go to [https://github.com/new](https://github.com/new).
2. Set **Repository name**: `AI-Train-Traffic-Control` (or any name you prefer).
3. Set Visibility: **Public** or **Private**.
4. **Important**: Leave "Add a README file", "Add .gitignore", and "Choose a license" **UNCHECKED** (since your project already includes them).
5. Click **Create repository**.

---

## Step 2: Upload Your Project (Choose ANY Method Below)

---

### 🌟 Option A: GitHub Desktop (Easiest & Recommended for Windows)

1. Download & Install [GitHub Desktop](https://desktop.github.com/) if you haven't already.
2. Sign in to your GitHub account.
3. In GitHub Desktop, go to **File** -> **Add Local Repository...** (or press `Ctrl + O`).
4. Choose the folder: `D:\AI Train Traffic Control`.
5. If prompted that this is not a Git repository, click **"create a repository"** or **"Initialize Git"**.
6. Enter a commit message: `Initial commit: AI Train Traffic Control system`.
7. Click **Commit to main**.
8. Click **Publish repository** to push it directly to your GitHub account.

---

### 🌐 Option B: GitHub Web Drag-and-Drop Upload

1. On your newly created GitHub repository page, click the link: **"uploading an existing file"**.
2. Unzip `AI-Train-Traffic-Control.zip` or drag-and-drop the files & folders (`client`, `server`, `README.md`, `package.json`, `.gitignore`) directly into the GitHub browser window.
3. Type a commit message: `Initial commit`.
4. Click **Commit changes**.

---

### 💻 Option C: Using Git CLI (Terminal)

If you have Git installed on your computer:

```bash
# 1. Open Terminal in the project folder (D:\AI Train Traffic Control)
cd "D:\AI Train Traffic Control"

# 2. Initialize Git
git init

# 3. Add files and make initial commit
git add .
git commit -m "Initial commit: AI Train Traffic Control system"

# 4. Link to your GitHub repository (replace USERNAME and REPO_NAME)
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/AI-Train-Traffic-Control.git

# 5. Push code to GitHub
git push -u origin main
```

---

## 🔒 Security & Environment Variables

- Your secret `.env` files are automatically excluded by `.gitignore` so your database passwords will **never** leak publicly.
- Anyone who clones your repository can simply copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env` to run the project.

---

## ⚡ How Anyone Can Run the Project After Cloning

```bash
# Install both backend & frontend dependencies
npm run install:all

# Start backend server
npm run dev:server

# Start frontend UI (in another terminal)
npm run dev:client
```
