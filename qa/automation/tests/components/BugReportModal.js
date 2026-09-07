// tests/components/BugReportModal.js — feedback modal (frontend/src/Components/BugReportModal.jsx).
// USE: open via the dashboard floating buttons, switch modes, fill, attach, submit, await success.
// Modes prefill the reporter from identity (else `Anonymous User`); success auto-closes after ~2s.
export class BugReportModal {
  // Wires openers (dashboard floating buttons) plus all modal controls. Success lives page-level:
  // the success view replaces the modal copy, so it cannot scope under the flavor-filtered root.
  constructor(page) {
    this.page = page;
    this.bugButton = page.getByRole('button', { name: /got a bug/i });
    this.ideaButton = page.getByRole('button', { name: /have an idea/i });
    this.root = page.locator('div.fixed.inset-0').filter({ hasText: /report a bug|share an idea/i });
    this.bugTab = this.root.getByRole('button', { name: 'Bug Report' });
    this.suggestionTab = this.root.getByRole('button', { name: 'Suggestion' });
    this.reporterBadge = this.root.getByText(/reporting as/i);
    this.textarea = this.root.locator('textarea');
    this.fileInput = this.root.locator('input[type="file"]');
    this.submitButton = this.root.getByRole('button', { name: /submit/i });
    this.successHeading = page.getByText('Success!');
  }

  // Opens the bug flavor. Used for FB-1/FB-2 bug paths and FB-3 validation.
  async openBug() {
    await this.bugButton.click();
  }

  // Opens the idea flavor. Used for FB-1/FB-2 suggestion paths.
  async openIdea() {
    await this.ideaButton.click();
  }

  // Submits a report with optional screenshot. T typed text; screenshot as PNG bytes or null.
  // Used for FB-2 end-to-end (assert `Success!` after, then the row via API).
  async submitReport({ text, screenshot = null }) {
    await this.textarea.fill(text);
    if (screenshot) await this.fileInput.setInputFiles(screenshot);
    await this.submitButton.click();
  }

  // Builds an in-memory 1x1 PNG payload for setInputFiles (no fixture file needed).
  static pngShot(name = 'shot.png') {
    return {
      name,
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    };
  }
}
