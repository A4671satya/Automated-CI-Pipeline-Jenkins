satya puppala

Open a terminal on the Ubuntu machine and run:

# update
sudo apt update && sudo apt upgrade -y

# install common tools
sudo apt install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release unzip

# Install Java (Jenkins needs Java 11+)
sudo apt install -y openjdk-11-jdk
java -version

# Install Node.js (LTS) and npm
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

# Optional: install zip for artifact packaging
sudo apt install -y zip

2. Install Jenkins (Debian/Ubuntu official package)
# add Jenkins key and repository
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io.key | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list

sudo apt update
sudo apt install -y jenkins

# start and enable Jenkins
sudo systemctl enable --now jenkins
sudo systemctl status jenkins

# if using UFW, allow 8080 (Jenkins)
sudo ufw allow 8080/tcp


After install, Jenkins initial admin password is in:

sudo cat /var/lib/jenkins/secrets/initialAdminPassword


Use that to finish first-time setup in the browser: http://<your-server-ip>:8080.

During setup install suggested plugins and create the first admin user.

3. Install recommended Jenkins plugins

From Jenkins UI → Manage Jenkins → Manage Plugins → Available:

Pipeline (should be installed by default)

Git (for GitHub checkout)

GitHub and GitHub Branch Source

NodeJS Plugin (optional — helps run node/npm in pipeline)

JUnit Plugin (to publish test reports)

ArtifactDeployer or just use archiveArtifacts (built-in)

Workspace Cleanup Plugin

Blue Ocean (optional visual pipeline UI)

Credentials Binding (helps manage secrets)
Install/restart Jenkins if required.

4. Create sample Node.js project locally

Create the repository structure (run locally, then push to GitHub):

mkdir Automated-CI-Pipeline-Jenkins
cd Automated-CI-Pipeline-Jenkins

# create folders
mkdir -p src tests docs

# init git
git init


Create package.json:

{
  "name": "simple-ci-app",
  "version": "1.0.0",
  "description": "Sample Node.js app for Jenkins CI pipeline",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "test": "jest --runInBand --reporters=default --json --outputFile=tests/test-results.json",
    "build": "mkdir -p build && cp -r src build/"
  },
  "dependencies": {},
  "devDependencies": {
    "jest": "^29.0.0"
  }
}


Create src/app.js (simple express-like server without external dependency for simplicity):

// src/app.js
const http = require('http');

const requestListener = (req, res) => {
  res.writeHead(200);
  res.end(JSON.stringify({ message: "Hello from CI app" }));
}

const server = http.createServer(requestListener);

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = { requestListener };


Create a simple test tests/test_app.js:

// tests/test_app.js
const { requestListener } = require('../src/app');
const httpMocks = require('node-mocks-http');

test('requestListener returns JSON message', () => {
  const req = httpMocks.createRequest({ method: 'GET', url: '/' });
  const res = httpMocks.createResponse();
  requestListener(req, res);
  const data = res._getData();
  expect(typeof data).toBe('string');
  const parsed = JSON.parse(data);
  expect(parsed.message).toBe('Hello from CI app');
});


Install dev dependency node-mocks-http locally to run tests locally:

npm install --save-dev node-mocks-http jest


Create .gitignore:

node_modules/
build/
*.zip
tests/test-results.json


Create README.md (you’ll expand later).

Commit:

git add .
git commit -m "Initial Node.js sample app for Jenkins CI"

5. Add a Jenkinsfile (Declarative pipeline)

Create Jenkinsfile in repo root:

pipeline {
  agent any

  tools {
    // if you install NodeJS plugin, name it here. Otherwise use system node.
    // nodejs 'NodeJS' // optional
  }

  environment {
    BUILD_DIR = 'build'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci || npm install'
      }
    }

    stage('Static Analysis (Optional)') {
      steps {
        echo 'Skipping static analysis (add ESLint here if desired)'
        // sh 'npm run lint' 
      }
    }

    stage('Unit Test') {
      steps {
        sh 'npm test'
      }
      post {
        always {
          // publish JUnit or JSON results conversions if needed. Jest JSON saved to tests/test-results.json
          archiveArtifacts artifacts: 'tests/test-results.json', fingerprint: true
          junit allowEmptyResults: true, testResults: '**/test-results.xml' // if converting to JUnit XML
        }
      }
    }

    stage('Build & Package') {
      steps {
        sh 'npm run build'
        sh 'zip -r artifact.zip ${BUILD_DIR}'
      }
    }

    stage('Archive Artifact') {
      steps {
        archiveArtifacts artifacts: 'artifact.zip', fingerprint: true
      }
    }
  }

  post {
    success {
      echo 'Build succeeded!'
      // add notifications here
    }
    failure {
      echo 'Build failed!'
      // add notifications here
    }
    always {
      cleanWs()
    }
  }
}


Notes:

Jest produces JSON in the earlier package.json script; if you want JUnit XML for Jenkins JUnit plugin, convert JSON → JUnit XML with a tool (e.g. jest-junit) and archive that; otherwise archive the JSON and/or use HTML/Jest plugin.

Commit and push Jenkinsfile to your GitHub repo.

6. Create GitHub repo and push code

On GitHub:

Create a new repository Automated-CI-Pipeline-Jenkins.

Copy remote link and push:

git remote add origin https://github.com/<your-username>/Automated-CI-Pipeline-Jenkins.git
git branch -M main
git push -u origin main

7. Configure GitHub webhook (for automatic triggers)

Two options:
A. Use GitHub webhook to Jenkins (legacy)
B. Use GitHub integration with Jenkins GitHub Branch Source (webhook easier for small setups)

Simplest webhook method:

On Jenkins, create a job or pipeline first (see next step) and expose Jenkins publicly or use a tunneling service if local (ngrok).

On GitHub repo → Settings → Webhooks → Add webhook:

Payload URL: http://<jenkins-domain>:8080/github-webhook/

Content type: application/json

Secret: optional (you can configure in Jenkins credentials)

Events: choose "Push events" and "Pull requests"

Add webhook

If Jenkins is behind firewall, you may set up GitHub App or use polling (less efficient). For local testing: use ngrok http 8080 and set payload to http://<ngrok-url>/github-webhook/.

8. Create Jenkins Pipeline job

Option A: Multibranch Pipeline (recommended for branch PR automation)
Option B: Single Pipeline job that points to Jenkinsfile

Single Pipeline job steps:

Jenkins UI → New Item → Enter name simple-ci-pipeline → Choose Pipeline → OK.

In Pipeline section:

Definition: Pipeline script from SCM

SCM: Git

Repository URL: https://github.com/<your-username>/Automated-CI-Pipeline-Jenkins.git

Credentials: (if private repo, add credentials → Manage Jenkins → Credentials → Add)

Branch Specifier: */main

Script Path: Jenkinsfile

Save.

If using GitHub webhook, configure the Build Trigger:

In job configuration → Build Triggers → check GitHub hook trigger for GITScm polling.

Save.

9. Set up Jenkins credentials (if private repo or to store tokens)

Jenkins → Credentials → System → Global credentials (add)

GitHub: username & PAT (Personal Access Token) with repo and admin:repo_hook if necessary.

Slack/webhook URL: secret text.

In pipeline you can reference credentials via withCredentials or credentials('id').

10. Run pipeline manually (first run) and inspect

From Jenkins job page:

Click Build Now → View Console Output.

Pipeline stages will appear (if Blue Ocean installed, use Blue Ocean for nicer UI).

After run completes, verify archived artifact.zip in Build Artifacts.

11. Publish test results in Jenkins

Jest → produce JUnit XML to integrate with Jenkins JUnit plugin:

Install jest-junit:

npm install --save-dev jest-junit


Update package.json test script:

"test": "jest --runInBand --reporters=default --reporters=jest-junit"


Set environment variable or configure jest-junit in package.json:

"jest-junit": {
  "outputDirectory": "tests",
  "outputName": "junit.xml"
}


In Jenkinsfile after tests, use junit '**/tests/junit.xml' to publish test results (replace earlier test archiving).

12. Artifacts & reports (what to archive)

artifact.zip (packaged build)

tests/junit.xml (test report)

tests/test-results.json (optional)

Screenshots saved locally in docs/ can be committed or uploaded manually.

In Jenkinsfile we used archiveArtifacts artifacts: 'artifact.zip', fingerprint: true — it archives into Jenkins.

13. Notifications (optional)

Email: Configure SMTP in Manage Jenkins → Configure System → E-mail Notification or use Email Extension Plugin.

Slack: use Slack plugin & add webhook URL credential; add slackSend steps in pipeline post blocks.

Example in declarative post:

post {
  success { slackSend channel: '#ci', color: 'good', message: "Build ${env.JOB_NAME} #${env.BUILD_NUMBER} succeeded" }
  failure { slackSend channel: '#ci', color: 'danger', message: "Build ${env.JOB_NAME} #${env.BUILD_NUMBER} failed" }
}


(Requires Slack plugin & credentials.)

14. CI hardening & production notes

Run Jenkins behind a reverse proxy (Nginx) and secure with TLS.

Run Jenkins with a non-root user.

Use credentials store and avoid plaintext secrets in Jenkinsfile.

Use multibranch pipelines and PR checks for better workflow.

Use containers (Docker) for consistent build environment (recommended). You can add a agent { docker { image 'node:lts' } } in Jenkinsfile to run builds inside a Node container.

15. Example: full minimal Jenkinsfile (with Docker agent)

If your Jenkins has Docker capability and preferred Node image:

pipeline {
  agent {
    docker { image 'node:lts' }
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install') { steps { sh 'npm ci' } }
    stage('Test') {
      steps { sh 'npm test' }
      post { always { junit '**/tests/junit.xml'; archiveArtifacts artifacts: 'tests/test-results.json', fingerprint: true } }
    }
    stage('Build') {
      steps {
        sh 'npm run build'
        sh 'zip -r artifact.zip build'
      }
    }
    stage('Archive') { steps { archiveArtifacts artifacts: 'artifact.zip', fingerprint: true } }
  }
  post { always { cleanWs() } }
}

16. What to include in your final submission folder

Follow your requested structure:

Automated-CI-Pipeline-Jenkins/
├── README.md
├── Jenkinsfile
├── src/
│   └── app.js
├── tests/
│   └── test_app.js
├── package.json
├── build/                 # generated by build step (not committed)
│   └── ...
├── artifact.zip           # produced by pipeline (not committed)
├── docs/
│   ├── pipeline_overview.png
│   ├── build_success.png
│   └── test_results.png
├── .gitignore
└── report.pdf             # optional


Notes: build/, artifact.zip are generated by Jenkins — add example files or screenshots under docs/.

17. README.md template (concise)

Add a README with: project description, tech stack, steps to run locally, Jenkins integration steps (a condensed version of this guide), expected outputs, and screenshots location (docs/).

Example short snippet you can paste at top of README.md:

# Automated CI Pipeline for a Web Application using Jenkins

## Description
This repo contains a simple Node.js app plus a Jenkinsfile demonstrating a CI pipeline:
Checkout → Install → Test → Build → Archive

## Tech stack
- Node.js (LTS)
- Jest (unit tests)
- Jenkins (CI)

## Quick start (locally)
1. `npm ci`
2. `npm test`
3. `npm run build`

18. Troubleshooting checklist

Jenkins can’t checkout repo: add credentials (username + PAT) and test.

Webhook doesn’t trigger: ensure Jenkins is reachable from GitHub; check webhook delivery logs in GitHub.

Tests failing locally but pass in Jenkins: check Node versions; use Docker agent for parity.

Artifact not found: ensure zip command executed and path matches archiveArtifacts.

19. Final tips & next steps

Convert Jest JSON to JUnit XML using jest-junit to leverage Jenkins JUnit plugin.

Use Multibranch Pipeline for automatic branch discovery and PR builds.

Use Docker to reproduce consistent CI environments.

Add ESLint or Flake8 stage for static analysis.

Document everything and add screenshots under docs/ (Jenkins dashboard, pipeline stages, archived artifacts, test results).
