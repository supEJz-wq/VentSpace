// tests/components/RightSidebar.js — Recent Topics + Recent Activity (frontend/src/Components/RightSidebar.jsx).
// USE: `await dashboard.sidebar.clickTopic('#tag')` / `clickContributor('name')` in DASH-F4/F5 tests.
export class RightSidebar {
  // Wires the sidebar region once — topic chips, contributor rows, and empty states.
  constructor(page) {
    this.page = page;
    this.region = page.getByText('Recent Topics').locator('..').locator('..');
    this.topicsEmpty = page.getByText('Start posting with #hashtags!');
    this.activityEmpty = page.getByText('Be the first to post!');
  }

  // Clicks a hashtag chip, e.g. clickTopic('#qa-tag'). Filters the feed and shows the banner.
  async clickTopic(topic) {
    const label = topic.replace('#', '');
    await this.page.getByRole('button', { name: new RegExp(`#?\\s*${label}`, 'i') }).first().click();
  }

  // Clicks a contributor row by exact username. Filters the feed to that author.
  async clickContributor(name) {
    await this.page.getByRole('button', { name: new RegExp(name, 'i') }).first().click();
  }
}
