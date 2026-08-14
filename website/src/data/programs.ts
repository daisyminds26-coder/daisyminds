import type { Program } from '@/types/program'

/**
 * The nine Daisy Minds programs — one source of truth for program content.
 * Shape mirrors the eventual `GET /api/v1/public/programs` response (see
 * `types/program.ts`). Content rules: marketing-level descriptions only —
 * no invented exact module/lesson counts, no unsupported certification or
 * hacking claims, no salary guarantees, "Placement Assistance" (never
 * "100% placement" or "guaranteed job"). `courseId` stays undefined until
 * an admin links a program to a real LMS `Course` record.
 */
const PROGRAMS: Program[] = [
  {
    id: 'web-development',
    slug: 'web-development',
    title: 'Web Development',
    shortTitle: 'Web Development',
    shortDescription:
      'Learn to design and build modern, responsive websites and web applications from the ground up.',
    description:
      'This program takes you from front-end fundamentals to building complete, responsive web applications. You will work with real project briefs, learn how modern development teams structure and ship code, and build a portfolio of working projects along the way.',
    heroImage: {
      src: '/images/programs/web-development.jpg',
      alt: 'A student building a website on a laptop, browser and code editor visible on screen',
    },
    cardImage: {
      src: '/images/programs/web-development.jpg',
      alt: 'A student building a website on a laptop, browser and code editor visible on screen',
    },
    icon: 'web-development',
    category: 'Development',
    featured: true,
    duration: '4 Months',
    level: 'Beginner',
    learningMode: 'Hybrid',
    highlights: ['Project-based learning', 'Portfolio-ready builds', 'Mentor code reviews'],
    skillTags: ['HTML & CSS', 'JavaScript', 'React', 'Responsive Design'],
    whatYouWillLearn: [
      {
        title: 'Structuring web pages',
        description: 'Build well-structured, accessible pages using modern HTML and CSS.',
      },
      {
        title: 'Interactive interfaces',
        description: 'Use JavaScript to build interactive, dynamic user experiences.',
      },
      {
        title: 'Component-based development',
        description: 'Build reusable UI components using a modern front-end framework.',
      },
      {
        title: 'Responsive design',
        description: 'Design layouts that work cleanly across desktop, tablet, and mobile.',
      },
      {
        title: 'Working with APIs',
        description: 'Connect front-end applications to real data through web APIs.',
      },
      {
        title: 'Version control',
        description: 'Track and collaborate on code using Git, the industry-standard workflow.',
      },
      {
        title: 'Deployment basics',
        description: 'Take a finished project from your machine to a live, hosted web address.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Front-end foundations',
        description: 'HTML, CSS, and JavaScript fundamentals, built up progressively.',
      },
      {
        title: 'Modern UI development',
        description: 'Component-based development with a widely-used front-end framework.',
      },
      {
        title: 'Working with data',
        description: 'Fetching, displaying, and managing data from web APIs.',
      },
      {
        title: 'Real-world project workflow',
        description: 'Version control, code reviews, and shipping projects like a real team.',
      },
    ],
    tools: ['HTML', 'CSS', 'JavaScript', 'React', 'Git & GitHub'],
    projects: [
      {
        title: 'Personal portfolio site',
        description: 'A fully responsive personal site built and deployed from scratch.',
      },
      {
        title: 'Interactive web application',
        description: 'A multi-page application with dynamic, data-driven interfaces.',
      },
      {
        title: 'API-connected project',
        description: 'A project that fetches and displays real data from a public API.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Front-End Developer',
        description: 'Build and maintain the user-facing parts of web applications.',
      },
      {
        title: 'Web Developer',
        description: 'Design and develop websites for businesses and products.',
      },
      {
        title: 'UI Developer',
        description: 'Turn design mockups into working, interactive interfaces.',
      },
    ],
    faq: [
      {
        question: 'Do I need coding experience to start?',
        answer:
          'No — this program is designed for beginners and builds up from the fundamentals of HTML, CSS, and JavaScript.',
      },
      {
        question: 'Will I build real projects?',
        answer:
          'Yes — every stage of the program includes hands-on project work reviewed by a mentor, so you leave with a working portfolio.',
      },
      {
        question: 'What do I need to get started?',
        answer: 'A laptop with a modern browser and a stable internet connection is enough.',
      },
    ],
    seo: {
      title: 'Web Development Program',
      description:
        'Learn front-end and full-stack web development with hands-on projects and mentor-led guidance at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Web Development?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport:
      'Mentors review your project work and unblock you during scheduled sessions and office hours.',
    accent: 'yellow',
  },
  {
    id: 'android-development',
    slug: 'android-development',
    title: 'Android Development',
    shortTitle: 'Android Dev',
    shortDescription:
      'Build native Android applications from your first screen to a complete, working app.',
    description:
      'Learn how Android apps are designed, built, and shipped. This program covers app architecture, interface design, and working with data on-device, so you can go from an idea to a functioning app you can show off.',
    heroImage: {
      src: '/images/programs/android-development.jpg',
      alt: 'A developer working on a mobile app, phone and laptop side by side showing code',
    },
    cardImage: {
      src: '/images/programs/android-development.jpg',
      alt: 'A developer working on a mobile app, phone and laptop side by side showing code',
    },
    icon: 'android-development',
    category: 'Development',
    featured: false,
    duration: '4 Months',
    level: 'Beginner',
    learningMode: 'Hybrid',
    highlights: ['Build real apps', 'Modern Android tooling', 'Mentor code reviews'],
    skillTags: ['Kotlin', 'Android Studio', 'UI Design', 'App Architecture'],
    whatYouWillLearn: [
      {
        title: 'Android fundamentals',
        description: 'Understand how Android apps are structured and how they run.',
      },
      {
        title: 'Building interfaces',
        description: 'Design and build screens users actually enjoy interacting with.',
      },
      {
        title: 'App navigation',
        description: 'Connect multiple screens into a coherent, working application flow.',
      },
      {
        title: 'Working with data',
        description: 'Store and retrieve data locally and connect to external services.',
      },
      {
        title: 'Debugging & testing',
        description: 'Find and fix issues using the tools professional Android teams rely on.',
      },
      {
        title: 'Publishing basics',
        description: 'Understand what it takes to prepare an app for release.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Core Android development',
        description: 'App structure, screens, and navigation using modern Android tooling.',
      },
      {
        title: 'Interface design',
        description: 'Building clean, usable interfaces following Android design guidelines.',
      },
      {
        title: 'Data & connectivity',
        description: 'Local storage and connecting apps to external data sources.',
      },
      {
        title: 'Project delivery',
        description: 'Taking a project from idea to a demonstrable, working build.',
      },
    ],
    tools: ['Kotlin', 'Android Studio', 'Jetpack Components', 'Git & GitHub'],
    projects: [
      {
        title: 'Multi-screen app',
        description: 'A working app with multiple connected screens and navigation.',
      },
      {
        title: 'Data-driven app',
        description: 'An app that stores and displays user data locally.',
      },
      {
        title: 'Capstone application',
        description: 'A complete app of your choosing, built end-to-end and reviewed by a mentor.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Android Developer',
        description: 'Build and maintain native Android applications.',
      },
      {
        title: 'Mobile App Developer',
        description: 'Contribute to mobile product teams building app experiences.',
      },
      {
        title: 'Junior App Engineer',
        description: 'Support app feature development within a larger engineering team.',
      },
    ],
    faq: [
      {
        question: 'Do I need Java or Kotlin experience already?',
        answer:
          'No prior mobile development experience is required — the program builds up Kotlin fundamentals from the start.',
      },
      {
        question: 'Will I need a specific phone to practice on?',
        answer:
          'No — you can build and test apps using the Android emulator that comes with Android Studio.',
      },
      {
        question: 'Will I publish an app to the Play Store?',
        answer:
          'The program covers what publishing involves; actual store submission depends on your own developer account and is outside the program scope.',
      },
    ],
    seo: {
      title: 'Android Development Program',
      description:
        'Learn native Android app development with Kotlin and hands-on, mentor-reviewed projects at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Android Development?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport:
      'Mentors review your app builds and guide you through debugging and design decisions.',
    accent: 'charcoal',
  },
  {
    id: 'cybersecurity',
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    shortTitle: 'Cybersecurity',
    shortDescription:
      'Understand how systems are secured and learn the practical fundamentals of defending them.',
    description:
      'This program introduces the core concepts behind securing systems, networks, and applications. You will learn how common threats work and how defensive practices are applied in real environments — a grounded, fundamentals-first approach rather than a headline-chasing "hacking" course.',
    heroImage: {
      src: '/images/programs/cybersecurity.jpg',
      alt: 'A security analyst reviewing monitoring dashboards across multiple screens',
    },
    cardImage: {
      src: '/images/programs/cybersecurity.jpg',
      alt: 'A security analyst reviewing monitoring dashboards across multiple screens',
    },
    icon: 'cybersecurity',
    category: 'Security',
    featured: true,
    duration: '3 Months',
    level: 'Intermediate',
    learningMode: 'Hybrid',
    highlights: ['Fundamentals-first approach', 'Hands-on labs', 'Mentor-guided practice'],
    skillTags: ['Network Security', 'Security Fundamentals', 'Risk Awareness', 'Secure Practices'],
    whatYouWillLearn: [
      {
        title: 'Security fundamentals',
        description: 'Core principles behind confidentiality, integrity, and availability.',
      },
      {
        title: 'Network security basics',
        description: 'How networks are secured and where common weaknesses appear.',
      },
      {
        title: 'Common threat patterns',
        description: 'Recognize how common attack techniques work at a conceptual level.',
      },
      {
        title: 'Secure practices',
        description: 'Practical habits and configurations that reduce real-world risk.',
      },
      {
        title: 'Security tooling awareness',
        description: 'Get familiar with the categories of tools security teams rely on.',
      },
      {
        title: 'Incident awareness',
        description: 'Understand how organizations detect and respond to security incidents.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Security foundations',
        description: 'The core concepts every security-focused role builds on.',
      },
      {
        title: 'Network & systems security',
        description: 'How networks and systems are protected in practice.',
      },
      {
        title: 'Defensive practices',
        description:
          'Practical, hands-on labs focused on defense, not exploitation for its own sake.',
      },
      {
        title: 'Awareness & response',
        description: 'How threats are identified and how teams respond to them.',
      },
    ],
    tools: ['Linux Fundamentals', 'Network Monitoring Tools', 'Security Frameworks'],
    projects: [
      {
        title: 'Security assessment exercise',
        description: 'A guided, lab-based exercise identifying common configuration weaknesses.',
      },
      {
        title: 'Network defense lab',
        description: 'Hands-on practice applying defensive network configurations.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Security Analyst (Entry-Level)',
        description: 'Support monitoring and initial response within a security team.',
      },
      {
        title: 'IT Security Support',
        description: 'Apply security fundamentals within broader IT operations roles.',
      },
    ],
    faq: [
      {
        question: 'Is this a hacking course?',
        answer:
          'No — this program teaches security fundamentals and defensive practices, not offensive hacking techniques or unrealistic certification shortcuts.',
      },
      {
        question: 'Do I need a networking background first?',
        answer:
          'Basic computer literacy is enough to start; the program introduces networking and security concepts progressively.',
      },
      {
        question: 'Does this program include a specific certification exam?',
        answer:
          'The program focuses on practical, job-relevant fundamentals. It does not promise or include a specific external certification.',
      },
    ],
    seo: {
      title: 'Cybersecurity Program',
      description:
        'Learn practical cybersecurity fundamentals — network security, secure practices, and defensive thinking — at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Cybersecurity?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors guide you through lab exercises and explain real-world context.',
    accent: 'graphite',
  },
  {
    id: 'artificial-intelligence',
    slug: 'artificial-intelligence',
    title: 'Artificial Intelligence',
    shortTitle: 'AI',
    shortDescription:
      'Learn how AI and machine learning systems actually work, and build practical, hands-on models.',
    description:
      'This program introduces the practical foundations of artificial intelligence and machine learning — how models learn from data, how they are built and evaluated, and how they are applied to real problems. The focus is on grounded, hands-on understanding rather than hype.',
    heroImage: {
      src: '/images/programs/artificial-intelligence.jpg',
      alt: 'A student working with data visualizations and model outputs on a laptop screen',
    },
    cardImage: {
      src: '/images/programs/artificial-intelligence.jpg',
      alt: 'A student working with data visualizations and model outputs on a laptop screen',
    },
    icon: 'artificial-intelligence',
    category: 'Data & AI',
    featured: true,
    duration: '5 Months',
    level: 'Intermediate',
    learningMode: 'Hybrid',
    highlights: ['Hands-on model building', 'Real datasets', 'Mentor-guided projects'],
    skillTags: ['Python', 'Machine Learning', 'Model Evaluation', 'Data Handling'],
    whatYouWillLearn: [
      {
        title: 'Machine learning foundations',
        description: 'How machine learning models learn patterns from data.',
      },
      {
        title: 'Working with data',
        description: 'Prepare and clean real-world datasets for model training.',
      },
      {
        title: 'Building models',
        description: 'Train practical models using widely-used machine learning libraries.',
      },
      {
        title: 'Evaluating models',
        description: 'Measure and interpret how well a model actually performs.',
      },
      {
        title: 'Applied AI concepts',
        description: 'See how AI techniques apply to real, practical problems.',
      },
      {
        title: 'Responsible use',
        description: 'Understand the limitations and responsible use of AI systems.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Python for AI',
        description: 'Programming fundamentals focused on data and machine learning workflows.',
      },
      {
        title: 'Machine learning fundamentals',
        description: 'Core concepts behind how models are trained and evaluated.',
      },
      {
        title: 'Practical model building',
        description: 'Hands-on projects using real, structured datasets.',
      },
      {
        title: 'Applied problem solving',
        description: 'Applying AI concepts to practical, project-based problems.',
      },
    ],
    tools: ['Python', 'NumPy & Pandas', 'Machine Learning Libraries', 'Jupyter Notebooks'],
    projects: [
      {
        title: 'Data preparation project',
        description: 'Clean and prepare a real dataset for model training.',
      },
      {
        title: 'Predictive model project',
        description: 'Build and evaluate a model that predicts an outcome from data.',
      },
      {
        title: 'Applied AI capstone',
        description:
          'A mentor-reviewed project applying AI techniques to a problem of your choice.',
      },
    ],
    careerOpportunities: [
      {
        title: 'AI/ML Trainee',
        description: 'Support machine learning teams with model development tasks.',
      },
      {
        title: 'Junior Data Scientist',
        description: 'Apply machine learning fundamentals within data-focused roles.',
      },
    ],
    faq: [
      {
        question: 'Do I need a math background?',
        answer:
          'Basic math comfort helps, but core statistics and math concepts are introduced as part of the program.',
      },
      {
        question: 'Do I need prior programming experience?',
        answer:
          'Python fundamentals are covered from the start, so prior programming experience is helpful but not required.',
      },
      {
        question: 'Will I work with real datasets?',
        answer: 'Yes — projects use real, structured datasets rather than toy examples.',
      },
    ],
    seo: {
      title: 'Artificial Intelligence Program',
      description:
        'Learn practical machine learning and AI fundamentals through hands-on, mentor-reviewed projects at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Artificial Intelligence?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport:
      'Mentors review your model-building projects and explain the reasoning behind results.',
    accent: 'yellow',
  },
  {
    id: 'data-science',
    slug: 'data-science',
    title: 'Data Science',
    shortTitle: 'Data Science',
    shortDescription:
      'Learn to analyze data, uncover insights, and communicate findings using real-world datasets.',
    description:
      'This program covers the full data science workflow — from exploring and cleaning data to statistical analysis and building predictive models. You will practice on real datasets and learn to communicate findings clearly, not just produce numbers.',
    heroImage: {
      src: '/images/programs/data-science.jpg',
      alt: 'A student analyzing charts and graphs on a laptop screen',
    },
    cardImage: {
      src: '/images/programs/data-science.jpg',
      alt: 'A student analyzing charts and graphs on a laptop screen',
    },
    icon: 'data-science',
    category: 'Data & AI',
    featured: true,
    duration: '5 Months',
    level: 'Intermediate',
    learningMode: 'Hybrid',
    highlights: ['Real datasets', 'Statistics to storytelling', 'Mentor-reviewed analysis'],
    skillTags: ['Python', 'Statistics', 'Data Visualization', 'SQL'],
    whatYouWillLearn: [
      {
        title: 'Data exploration',
        description: 'Explore and understand real datasets before drawing conclusions.',
      },
      {
        title: 'Statistical thinking',
        description: 'Apply core statistics concepts to interpret data correctly.',
      },
      {
        title: 'Data cleaning',
        description: 'Handle messy, real-world data so analysis is trustworthy.',
      },
      {
        title: 'Data visualization',
        description: 'Turn data into clear, honest visual stories.',
      },
      {
        title: 'Querying data',
        description: 'Use SQL to retrieve and work with structured data.',
      },
      {
        title: 'Predictive analysis',
        description: 'Build simple predictive models grounded in statistical fundamentals.',
      },
      {
        title: 'Communicating findings',
        description: 'Present analysis clearly to both technical and non-technical audiences.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Statistics fundamentals',
        description: 'The statistical concepts that underpin sound data analysis.',
      },
      {
        title: 'Python for data science',
        description: 'Programming fundamentals applied to data analysis workflows.',
      },
      {
        title: 'Data visualization & storytelling',
        description: 'Turning analysis into clear, understandable insights.',
      },
      {
        title: 'Applied analysis projects',
        description: 'End-to-end analysis on real, structured datasets.',
      },
    ],
    tools: ['Python', 'Pandas', 'SQL', 'Data Visualization Libraries'],
    projects: [
      {
        title: 'Exploratory data analysis project',
        description: 'A full exploration and cleanup of a real, messy dataset.',
      },
      {
        title: 'Insight report',
        description: 'A visual, presentation-ready report communicating key findings.',
      },
      {
        title: 'Applied capstone analysis',
        description: 'An end-to-end analysis project reviewed by a mentor.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Junior Data Analyst',
        description: 'Support analysis and reporting within a data team.',
      },
      {
        title: 'Data Science Trainee',
        description: 'Contribute to data science projects under mentor or team guidance.',
      },
    ],
    faq: [
      {
        question: 'How is this different from Data Analytics?',
        answer:
          'Data Science goes deeper into statistics, programming, and predictive modeling; Data Analytics focuses more on business reporting and dashboards.',
      },
      {
        question: 'Do I need to know Python already?',
        answer: 'No — Python is taught from the fundamentals as part of the program.',
      },
      {
        question: 'Will I work with real data?',
        answer: 'Yes — every project uses real, structured datasets rather than toy examples.',
      },
    ],
    seo: {
      title: 'Data Science Program',
      description:
        'Learn data analysis, statistics, and predictive modeling through hands-on, mentor-reviewed projects at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Data Science?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors review your analysis and help you interpret results correctly.',
    accent: 'charcoal',
  },
  {
    id: 'data-analytics',
    slug: 'data-analytics',
    title: 'Data Analytics',
    shortTitle: 'Data Analytics',
    shortDescription: 'Learn to turn business data into clear dashboards, reports, and decisions.',
    description:
      'This program focuses on the practical side of data analytics — working with spreadsheets and databases, building dashboards, and turning raw business data into insights decision-makers can actually use.',
    heroImage: {
      src: '/images/programs/data-analytics.jpg',
      alt: 'A student reviewing analytics dashboards on a laptop screen',
    },
    cardImage: {
      src: '/images/programs/data-analytics.jpg',
      alt: 'A student reviewing analytics dashboards on a laptop screen',
    },
    icon: 'data-analytics',
    category: 'Data & AI',
    featured: false,
    duration: '3 Months',
    level: 'Beginner',
    learningMode: 'Hybrid',
    highlights: ['Business-focused analytics', 'Dashboard building', 'Mentor-reviewed reports'],
    skillTags: ['Excel', 'SQL', 'Dashboards', 'Reporting'],
    whatYouWillLearn: [
      {
        title: 'Data fundamentals',
        description: 'How business data is structured, stored, and used for decisions.',
      },
      {
        title: 'Spreadsheet analysis',
        description: 'Analyze and model data using advanced spreadsheet techniques.',
      },
      {
        title: 'Querying data',
        description: 'Use SQL to pull the exact data you need from a database.',
      },
      {
        title: 'Dashboard building',
        description: 'Build clear, interactive dashboards for business reporting.',
      },
      {
        title: 'Reporting for decisions',
        description: 'Turn analysis into reports that support real business decisions.',
      },
      {
        title: 'Data quality basics',
        description: 'Recognize and correct common data-quality issues.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Spreadsheet & database fundamentals',
        description: 'Core tools used daily in business analytics roles.',
      },
      {
        title: 'Querying & reporting',
        description: 'Pulling and shaping data for clear, repeatable reporting.',
      },
      {
        title: 'Dashboards & visualization',
        description: 'Presenting data in a way business teams can act on.',
      },
      {
        title: 'Applied business projects',
        description: 'Working through analytics tasks modeled on real business scenarios.',
      },
    ],
    tools: ['Excel', 'SQL', 'Dashboard & Reporting Tools'],
    projects: [
      {
        title: 'Sales/operations dashboard',
        description: 'A dashboard summarizing a realistic business dataset.',
      },
      {
        title: 'Analytics report',
        description: 'A written and visual report answering a specific business question.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Junior Data Analyst',
        description: 'Support reporting and analysis for a business or operations team.',
      },
      {
        title: 'Business Analytics Associate',
        description: 'Turn business data into dashboards and recurring reports.',
      },
    ],
    faq: [
      {
        question: 'How is this different from Data Science?',
        answer:
          'Data Analytics focuses on business reporting, dashboards, and spreadsheet/SQL skills; Data Science goes deeper into statistics and predictive modeling.',
      },
      {
        question: 'Do I need a technical background?',
        answer: 'No — this program is designed for beginners and builds up from fundamentals.',
      },
    ],
    seo: {
      title: 'Data Analytics Program',
      description:
        'Learn business data analytics, dashboards, and reporting through hands-on, mentor-reviewed projects at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Data Analytics?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors review your dashboards and reports for clarity and accuracy.',
    accent: 'graphite',
  },
  {
    id: 'devops',
    slug: 'devops',
    title: 'DevOps',
    shortTitle: 'DevOps',
    shortDescription: 'Learn how modern teams build, automate, and reliably ship software.',
    description:
      'This program introduces the practices and tooling behind modern software delivery — version control workflows, automation, and the fundamentals of building and monitoring reliable systems.',
    heroImage: {
      src: '/images/programs/devops.jpg',
      alt: 'A developer working across multiple monitors with terminal and pipeline dashboards',
    },
    cardImage: {
      src: '/images/programs/devops.jpg',
      alt: 'A developer working across multiple monitors with terminal and pipeline dashboards',
    },
    icon: 'devops',
    category: 'Cloud & Infrastructure',
    featured: false,
    duration: '4 Months',
    level: 'Intermediate',
    learningMode: 'Hybrid',
    highlights: ['Hands-on automation labs', 'Real deployment workflows', 'Mentor-guided practice'],
    skillTags: ['Linux', 'Git', 'CI/CD', 'Automation'],
    whatYouWillLearn: [
      {
        title: 'Linux fundamentals',
        description: 'Work confidently in a Linux command-line environment.',
      },
      {
        title: 'Version control workflows',
        description: 'Collaborate on code using branching and review workflows.',
      },
      {
        title: 'Automation basics',
        description: 'Automate repetitive tasks in the software delivery process.',
      },
      {
        title: 'Continuous integration',
        description: 'Understand how teams automatically build and test code changes.',
      },
      {
        title: 'Continuous deployment',
        description: 'Understand how changes move safely from code to production.',
      },
      {
        title: 'Monitoring basics',
        description: 'Recognize how teams monitor systems for reliability.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Linux & command-line fundamentals',
        description: 'The operating-system fundamentals every DevOps workflow relies on.',
      },
      {
        title: 'Version control & collaboration',
        description: 'Team-based development workflows using Git.',
      },
      {
        title: 'CI/CD fundamentals',
        description: 'How code moves from commit to deployment in modern teams.',
      },
      {
        title: 'Containers & infrastructure basics',
        description: 'An introduction to how applications are packaged and run reliably.',
      },
    ],
    tools: ['Linux', 'Git & GitHub', 'Docker', 'CI/CD Pipelines'],
    projects: [
      {
        title: 'Automated pipeline project',
        description: 'Set up an automated build-and-test pipeline for a sample project.',
      },
      {
        title: 'Containerized application',
        description: 'Package and run an application using containers.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Junior DevOps Engineer',
        description: 'Support automation and deployment workflows within an engineering team.',
      },
      {
        title: 'Support/Platform Engineer',
        description: 'Help maintain reliable infrastructure and deployment processes.',
      },
    ],
    faq: [
      {
        question: 'Do I need a development background first?',
        answer:
          'Basic familiarity with the command line and code is helpful; the fundamentals are covered as part of the program.',
      },
      {
        question: 'Is this the same as Cloud Computing?',
        answer:
          'DevOps focuses on delivery workflows and automation; Cloud Computing focuses on cloud platforms and infrastructure. They complement each other well.',
      },
    ],
    seo: {
      title: 'DevOps Program',
      description:
        'Learn DevOps fundamentals — automation, CI/CD, and reliable software delivery — through hands-on labs at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in DevOps?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors guide you through pipeline and automation labs step by step.',
    accent: 'yellow',
  },
  {
    id: 'cloud-computing',
    slug: 'cloud-computing',
    title: 'Cloud Computing',
    shortTitle: 'Cloud Computing',
    shortDescription: 'Learn how modern applications are hosted, scaled, and managed on the cloud.',
    description:
      'This program introduces core cloud computing concepts — how cloud infrastructure works, how applications are deployed and scaled, and the fundamentals every cloud-focused role builds on.',
    heroImage: {
      src: '/images/programs/cloud-computing.jpg',
      alt: 'A professional working with cloud infrastructure dashboards on a laptop',
    },
    cardImage: {
      src: '/images/programs/cloud-computing.jpg',
      alt: 'A professional working with cloud infrastructure dashboards on a laptop',
    },
    icon: 'cloud-computing',
    category: 'Cloud & Infrastructure',
    featured: true,
    duration: '4 Months',
    level: 'Intermediate',
    learningMode: 'Hybrid',
    highlights: ['Hands-on cloud labs', 'Real deployment practice', 'Mentor-guided projects'],
    skillTags: ['Cloud Fundamentals', 'Virtual Infrastructure', 'Scalability', 'Networking Basics'],
    whatYouWillLearn: [
      {
        title: 'Cloud computing fundamentals',
        description: 'Understand core cloud concepts and how they differ from on-premise systems.',
      },
      {
        title: 'Virtual infrastructure',
        description: 'Work with virtual machines, storage, and networking in the cloud.',
      },
      {
        title: 'Deploying applications',
        description: 'Deploy a working application to a cloud environment.',
      },
      {
        title: 'Scalability basics',
        description: 'Understand how cloud systems scale to handle changing demand.',
      },
      {
        title: 'Cloud security basics',
        description: 'Learn foundational practices for securing cloud resources.',
      },
      {
        title: 'Cost & resource awareness',
        description: 'Understand how cloud resources are managed and monitored responsibly.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Cloud fundamentals',
        description: 'Core concepts behind modern cloud computing platforms.',
      },
      {
        title: 'Infrastructure basics',
        description: 'Virtual machines, storage, and networking fundamentals.',
      },
      {
        title: 'Deployment practice',
        description: 'Hands-on labs deploying and managing applications in the cloud.',
      },
      {
        title: 'Reliability & scale',
        description: 'How cloud systems stay available as demand changes.',
      },
    ],
    tools: ['Cloud Platform Fundamentals', 'Linux', 'Networking Basics'],
    projects: [
      {
        title: 'Cloud deployment lab',
        description: 'Deploy and configure a working application in a cloud environment.',
      },
      {
        title: 'Infrastructure setup project',
        description: 'Set up virtual infrastructure for a sample application.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Junior Cloud Engineer',
        description: 'Support cloud infrastructure setup and maintenance.',
      },
      {
        title: 'Cloud Support Associate',
        description: 'Help teams manage and troubleshoot cloud-hosted applications.',
      },
    ],
    faq: [
      {
        question: 'Which cloud platform will I learn?',
        answer:
          'The program teaches cloud fundamentals that transfer across major providers, with hands-on practice on a widely-used platform.',
      },
      {
        question: 'Do I need networking knowledge first?',
        answer:
          'Basic computer literacy is enough — networking fundamentals are introduced as part of the program.',
      },
    ],
    seo: {
      title: 'Cloud Computing Program',
      description:
        'Learn cloud computing fundamentals — infrastructure, deployment, and scalability — through hands-on labs at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Cloud Computing?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors guide you through cloud labs and deployment troubleshooting.',
    accent: 'charcoal',
  },
  {
    id: 'digital-marketing',
    slug: 'digital-marketing',
    title: 'Digital Marketing',
    shortTitle: 'Digital Marketing',
    shortDescription:
      'Learn to plan, run, and measure digital marketing campaigns across modern channels.',
    description:
      'This program covers the practical fundamentals of digital marketing — content, social media, search, and campaign measurement — so you can plan and run real marketing work, not just talk about strategy.',
    heroImage: {
      src: '/images/programs/digital-marketing.jpg',
      alt: 'A creative professional planning marketing content on a laptop and phone',
    },
    cardImage: {
      src: '/images/programs/digital-marketing.jpg',
      alt: 'A creative professional planning marketing content on a laptop and phone',
    },
    icon: 'digital-marketing',
    category: 'Marketing',
    featured: true,
    duration: '3 Months',
    level: 'Beginner',
    learningMode: 'Hybrid',
    highlights: ['Campaign-based learning', 'Real content practice', 'Mentor-reviewed work'],
    skillTags: ['Content Strategy', 'Social Media', 'SEO Basics', 'Campaign Analytics'],
    whatYouWillLearn: [
      {
        title: 'Digital marketing fundamentals',
        description: 'How digital channels fit together in a marketing strategy.',
      },
      {
        title: 'Content planning',
        description: 'Plan and create content aligned to a clear audience and goal.',
      },
      {
        title: 'Social media marketing',
        description: 'Build and manage a coherent social media presence.',
      },
      {
        title: 'Search fundamentals',
        description: 'Understand the basics of how search visibility works.',
      },
      {
        title: 'Campaign measurement',
        description: 'Track and interpret campaign performance using key metrics.',
      },
      {
        title: 'Audience & positioning',
        description: 'Understand how to research and speak to a specific audience.',
      },
    ],
    curriculumHighlights: [
      {
        title: 'Marketing fundamentals',
        description: 'Core concepts behind planning a digital marketing strategy.',
      },
      {
        title: 'Content & social media',
        description: 'Practical content creation and social media management.',
      },
      {
        title: 'Search & visibility basics',
        description: 'Foundational concepts behind organic and paid visibility.',
      },
      {
        title: 'Measurement & reporting',
        description: 'Reading campaign data and turning it into next steps.',
      },
    ],
    tools: ['Content Planning Tools', 'Social Media Platforms', 'Analytics Dashboards'],
    projects: [
      {
        title: 'Content calendar & campaign',
        description: 'Plan and execute a mock content campaign for a brand.',
      },
      {
        title: 'Campaign performance report',
        description: 'Analyze and present the results of a marketing campaign.',
      },
    ],
    careerOpportunities: [
      {
        title: 'Digital Marketing Associate',
        description: 'Support content, social, and campaign execution for a brand or agency.',
      },
      {
        title: 'Social Media Coordinator',
        description: 'Plan and manage a brand’s social media presence.',
      },
    ],
    faq: [
      {
        question: 'Do I need a marketing background?',
        answer: 'No — this program is designed for beginners and builds up from fundamentals.',
      },
      {
        question: 'Will I work on real campaigns?',
        answer: 'Yes — projects are built around realistic campaign briefs, reviewed by a mentor.',
      },
    ],
    seo: {
      title: 'Digital Marketing Program',
      description:
        'Learn practical digital marketing — content, social media, and campaign measurement — through hands-on projects at Daisy Minds.',
    },
    cta: {
      heading: 'Ready to Build Your Future in Digital Marketing?',
      description: 'Start with the plan that fits your goals and timeline.',
    },
    mentorSupport: 'Mentors review your campaign work and give practical, actionable feedback.',
    accent: 'graphite',
  },
]

export async function getPrograms(): Promise<Program[]> {
  return Promise.resolve(PROGRAMS)
}

export async function getProgramBySlug(slug: string): Promise<Program | undefined> {
  return Promise.resolve(PROGRAMS.find((program) => program.slug === slug))
}

export async function getFeaturedPrograms(limit = 6): Promise<Program[]> {
  return Promise.resolve(PROGRAMS.filter((program) => program.featured).slice(0, limit))
}

export async function getProgramCategories(): Promise<string[]> {
  return Promise.resolve(Array.from(new Set(PROGRAMS.map((program) => program.category))))
}
