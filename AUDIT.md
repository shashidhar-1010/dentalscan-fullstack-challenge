## DentalScan UX & Technical Audit

### UX Observations

The scanning flow is generally intuitive, and face detection works well in the front view. However, when the user opens their mouth, the guidance square does not align correctly with the mouth region, appearing at inconsistent positions. This can confuse users and affect scan accuracy.

While the system avoids re-recording the same front view, there is no explicit feedback explaining this behavior. The only indication is a color change to red, which is not sufficiently descriptive.

In left and right views, maintaining alignment within the guide is difficult, especially without dynamic adjustment. Additionally, there is no option to switch from the front camera to the rear camera, which limits usability and may impact image quality.

### Technical Risks

Misalignment of the overlay suggests potential issues with landmark detection or calibration. Lack of clear feedback increases the risk of capturing low-quality scans without user awareness. Delayed UI response after capture (notably in upper and lower views) indicates inefficient async handling.

### Mobile Challenges

Users may struggle with hand stability and positioning during side-angle captures. Noticeable lag after capturing images, without any loading or progress indicator, creates uncertainty and reduces user confidence.

### Suggested Improvements

Introduce a dynamic visual guidance overlay aligned with facial landmarks, especially the mouth. Provide real-time textual feedback (e.g., “Move closer”, “Hold steady”, “Try a different angle”) instead of relying only on color changes. Enable switching between front and rear cameras. Add loading indicators during capture processing to improve perceived performance.
