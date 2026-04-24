### 1. Project Actions (Agnostic Language)

1.  **Optimization of Audio Initialization**: Implemented a caching mechanism for the audio execution environment at the module level to reduce resource overhead and ensured compliance with browser interaction policies by handling the active state resumption.
2.  **Removal of Redundant Utility Logic**: Identified and deleted an unused network discovery utility to streamline the codebase.
3.  **Refinement of Environment Deployment Scripts**: Adjusted the primary deployment logic to account for specific cloud-based environment constraints, including port availability and execution timing.
4.  **Adjustment of Execution Entry Points**: Added a standardized startup command to the project configuration to facilitate automated environment initialization.
5.  **Motion Detection Optimization**: Refined the algorithmic approach for detecting changes in visual streams to improve processing efficiency.
6.  **Launcher Architecture Refactoring**: Restructured the multi-platform initialization logic to improve stability and reliability across different operating systems.
7.  **Dependency Configuration Adjustment**: Relocated build-time dependencies to the primary runtime configuration to prevent initialization failures in restricted environments.
8.  **Automated Test Infrastructure Setup**: Configured a testing framework and established a dedicated directory structure for verification logic.
9.  **Integration of Unit Verification**: Implemented comprehensive logic checks for the core communication handshake process.
10. **Resolution of Networking Timeouts**: Optimized the communication protocol handling to prevent premature connection termination during environment scans.
11. **UI Component Deletion**: Removed an obsolete interface component responsible for media management to reduce application complexity.
12. **Implementation of Robust Data Parsing**: Integrated defensive programming patterns, including error handling blocks, for all incoming data streams to prevent application failure due to malformed payloads.
13. **Protocol Standardization**: Shifted the primary communication protocol for specific deployment targets to resolve networking conflicts.
14. **Implementation of Local Persistence**: Developed a storage utility for the long-term retention of communication history and media metadata using browser-based persistent storage.
15. **Implementation of Temporal Data Cleanup**: Integrated a time-to-live (TTL) mechanism to automatically purge expired data from local storage.
16. **Implementation of Network Service Discovery**: Integrated logic for the automatic identification of peers within a local area network using standard discovery protocols.
17. **Bootstrapping of Automated Workflow Pipeline**: Established a multi-phase automated pipeline for analyzing, planning, validating, and merging project updates.
18. **CI/CD Workflow Configuration**: Created automated execution definitions for project maintenance and validation tasks.
19. **Project Rebranding Execution**: Updated all user interface text, internal identifiers, and project documentation to reflect a new unified product name.
20. **Visual Styling Initialization**: Configured a modern utility-first styling engine and integrated it into the build process.
21. **HTML Entry Point Correction**: Relocated the primary HTML entry point to the project root and updated module references to ensure compatibility with the build engine.
22. **OS-Specific Script Generation**: Authored dedicated launcher scripts for Windows, macOS, and Linux to provide a standardized user experience across platforms.
23. **Canvas-Based Verification Implementation**: Integrated specialized mocking tools to enable the testing of visual processing logic.
24. **TypeScript Type Safety Enforcement**: Implemented strict type definitions for all communication payloads and peer management logic.
25. **Audio Context Lazy Loading**: Implemented deferred initialization for audio resources to minimize initial load times.

### 2. Documentation Filenames

- README.md (Root)
- RESOURCES.md (Root)
- TODO.md (Root)
- requirements.md (Root)
- docs/README.md
- docs/ARCHITECTURE.md
- docs/architecture.md
- docs/deployment.md
- docs/known-gaps.md
- docs/requirements.md
- docs/troubleshooting.md

### 3. Rules Followed

1.  **Audio Context Management**: Always handle the 'suspended' state of the AudioContext by calling '.resume()' to comply with browser autoplay policies.
2.  **Audio Resource Reuse**: Cache AudioContext instances at the module level and reuse them instead of recreating them to optimize performance.
3.  **Mobile Compatibility**: Enforce full mobile and Android OS compatibility, including responsive layouts and touch-friendly targets.
4.  **Local Discovery Protocol**: Utilize 'bonjour-service' for advertising and discovering services on the local network.
5.  **Data Persistence Strategy**: Use 'localStorage' for chat and media management, incorporating automatic TTL-based cleanup.
6.  **Test Location Standard**: Place all automated tests in a root '/tests' directory rather than colocating them with source files.
7.  **Defensive JSON Processing**: Always wrap 'JSON.parse' calls in try-catch blocks when processing external payloads to prevent application crashes.
8.  **Environment-Specific Dependency Management**: Move build-time tools to the 'dependencies' section of 'package.json' to prevent failures in environments that prune development dependencies.
9.  **Dynamic Dependency Loading**: Use dynamic imports for non-built-in dependencies in deployment scripts to handle clean environments.
10. **Deployment Startup Requirements**: Ensure 'package.json' includes a 'start' script that initializes both the application and the signaling infrastructure.
11. **Strict Offline Constraint**: Enforce the absence of internet-dependent libraries, CDNs, or WAN-based APIs to ensure 100% offline functionality.
12. **Secure Context Verification**: Configure frontend testing to ignore HTTPS errors when dealing with local self-signed certificates.
13. **Vite Structure Compliance**: Ensure 'index.html' is located at the project root and includes a module script tag for the entry point.
14. **Deep Planning Protocol**: Achieve absolute certainty of requirements via Q&A before proposing or executing a formal plan.
15. **Recursive Stability Verification**: Perform multiple recursive verification runs (clearing caches and modules) for critical deployment changes to ensure absolute stability.
