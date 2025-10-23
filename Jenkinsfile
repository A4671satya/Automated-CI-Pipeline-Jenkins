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

