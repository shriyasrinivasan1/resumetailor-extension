// ResumeTailor AI — Seed Script
// Paste this into the popup's DevTools console to populate your resume database.
//
// How to open the popup's console:
//   1. Click the ResumeTailor AI extension icon to open the popup
//   2. Right-click anywhere inside the popup → Inspect
//   3. In the DevTools Console tab, paste this entire script and press Enter

chrome.storage.local.set({
  experiences: [

    // ── Profile ──────────────────────────────────────────────────────────────
    {
      id: 'profile-1',
      type: 'profile',
      fullName: 'Shriya Srinivasan',
      email: 'shriya@srinivasans.com',
      phone: '408-646-5507',
      linkedin: 'linkedin.com/in/shriyasrinivasans',
      github: 'github.com/shriyasrinivasan1',
    },

    // ── Education ─────────────────────────────────────────────────────────────
    {
      id: 'edu-1',
      type: 'education',
      school: 'Rutgers University - New Brunswick',
      location: 'New Brunswick, NJ',
      degreeType: 'B.S.',
      majors: ['Computer Science', 'Data Science'],
      minors: ['Business Administration'],
      startYear: '2022',
      gradYear: '2026',
      isExpected: true,
    },

    // ── Work Experience ───────────────────────────────────────────────────────
    {
      id: 'exp-1',
      type: 'experience',
      position: 'Software Engineering Intern',
      company: 'Nokia',
      location: 'Sunnyvale, CA',
      startDate: '2025-05',
      endDate: '2025-08',
      isPresent: false,
      skills: ['React', 'Nginx', 'Node.js', 'PostgreSQL', 'Docker', 'JWT', 'RESTful APIs', 'Prometheus', 'Grafana', 'Microservices'],
      achievements: [
        'Developed app enabling watermarked confidential document downloads using React, Nginx, Node.js, and PostgreSQL.',
        'Designed scalable backend microservices for file conversion, access control, and logging with JWT authentication and RESTful APIs.',
        'Implemented end-to-end deployment with Docker and built comprehensive monitoring system using Prometheus and Grafana.',
      ],
    },
    {
      id: 'exp-2',
      type: 'experience',
      position: 'Software Engineering Intern',
      company: 'Nokia',
      location: 'Sunnyvale, CA',
      startDate: '2024-05',
      endDate: '2024-08',
      isPresent: false,
      skills: ['Git', 'SCM', 'Python', 'JSON', 'automated testing', 'network testing', 'traffic generation'],
      achievements: [
        'Designed and built prototype Git-like wrapper around custom SCM server, improving versioning process efficiency.',
        'Developed automated system to save previous test data and enable re-running non-flaky tests.',
        'Engineered traffic generator wrapper to streamline network metric parsing and testing workflows using structured JSON.',
      ],
    },
    {
      id: 'exp-3',
      type: 'experience',
      position: 'Mobile Application Developer Intern',
      company: 'Onymos',
      location: 'Palo Alto, CA',
      startDate: '2023-07',
      endDate: '2023-08',
      isPresent: false,
      skills: ['Android', 'Kotlin', 'Java', 'UI/UX', 'mobile development'],
      achievements: [
        'Developed sample Android app demonstrating Onymos Core, Share, and DataStore component libraries.',
        'Designed and optimized onboarding screens; contributed UI layouts for payment, registration, and recipe detail pages.',
      ],
    },
    {
      id: 'exp-4',
      type: 'experience',
      position: 'Software Quality Assurance Engineer Intern',
      company: 'Espresa',
      location: 'Palo Alto, CA',
      startDate: '2023-06',
      endDate: '2023-09',
      isPresent: false,
      skills: ['QA testing', 'bug tracking', 'cross-functional collaboration', 'structured testing'],
      achievements: [
        'Conducted role-based testing on Espresa platform, identifying bugs and improving functionality using structured testing methods.',
        'Collaborated with developers, Customer Success Directors, and CTO to resolve platform issues and ensure quality delivery.',
      ],
    },

    // ── Projects ──────────────────────────────────────────────────────────────
    {
      id: 'proj-1',
      type: 'project',
      name: 'Barclays x BITS Datathon',
      startDate: '',
      endDate: '2025-03',
      isOngoing: false,
      bullets: [
        'Built Streamlit dashboard analyzing social media usage and mental health with interactive visualizations and user-driven analytics.',
        'Developed Mental Health Predictor using scikit-learn to estimate wellness from behavioral and demographic survey data.',
        'Designed data visualizations with Plotly, Seaborn, Matplotlib; analyzed trends using pandas, NumPy, and SciPy.',
      ],
    },
    {
      id: 'proj-2',
      type: 'project',
      name: 'Lucidity — AI Workplace Analytics (RU HackHers, ADP Track)',
      startDate: '',
      endDate: '2025-02',
      isOngoing: false,
      bullets: [
        'Built AI-driven platform analyzing workplace communications and video calls to provide sentiment and engagement health insights.',
        'Developed chatbots and computer vision tools with FastAPI, LLaMA, and OpenCV for real-time feedback and engagement analysis.',
        'Created React dashboard integrating Gmail/Webex APIs to display metrics including Happiness Index and Engagement Score.',
      ],
    },
    {
      id: 'proj-3',
      type: 'project',
      name: 'Fannie Mae Loan Automation App',
      startDate: '',
      endDate: '2023-11',
      isOngoing: false,
      bullets: [
        'Developed loan automation app with Streamlit, GPT-3.5 Turbo, and ML to streamline mortgage processing and decisions.',
        'Delivered personalized financial advice and data-driven recommendations, enhancing user experience and decision-making.',
      ],
    },

    // ── Leadership ────────────────────────────────────────────────────────────
    {
      id: 'lead-1',
      type: 'leadership',
      orgName: 'Kappa Theta Pi — Professional Tech Fraternity',
      position: 'National President',
      startDate: '2025-05',
      endDate: '',
      isPresent: true,
      location: '',
      bullets: [
        'Lead national executive board across 27+ chapters, overseeing operations, growth, and leadership for 800+ members.',
        'Organize national events with tech speakers, fostering professional development, alumni engagement, and corporate partnerships.',
      ],
    },
    {
      id: 'lead-2',
      type: 'leadership',
      orgName: 'Kappa Theta Pi — New Brunswick Chapter',
      position: 'President',
      startDate: '2024-05',
      endDate: '2025-05',
      isPresent: false,
      location: 'New Brunswick, NJ',
      bullets: [
        'Founded and grew chapter from 3 to 38 members by establishing mission, structure, recruitment, and key industry partnerships.',
        'Organized panels and workshops with leaders from Meta, Adobe, and Vanguard to enhance member professional development.',
      ],
    },

    // ── Skills ────────────────────────────────────────────────────────────────
    {
      id: 'skills-1',
      type: 'skills',
      technical: ['Java', 'Kotlin', 'Python', 'JavaScript', 'C', 'Swift', 'SQL'],
      frameworks: ['React', 'Node.js', 'SwiftUI', 'FastAPI', 'TensorFlow', 'scikit-learn', 'OpenCV', 'Streamlit', 'Pandas', 'NumPy', 'Matplotlib', 'Plotly', 'Seaborn', 'SciPy', 'Librosa'],
      databases: ['PostgreSQL', 'RESTful APIs', 'JSON'],
      devTools: ['Git', 'Docker', 'Kubernetes', 'Nginx', 'Prometheus', 'Grafana', 'VS Code', 'Xcode', 'Android Studio', 'Google Colab', 'Jira', 'Cursor', 'Windsurf'],
      productSkills: ['Agile/Scrum', 'Cross-functional collaboration', 'Technical documentation', 'QA & structured testing', 'Data analysis & visualization'],
    },

  ]
}, () => {
  if (chrome.runtime.lastError) {
    console.error('❌ Error:', chrome.runtime.lastError.message);
  } else {
    console.log('✅ Resume database populated! Close and reopen the popup to see your data.');
  }
});
