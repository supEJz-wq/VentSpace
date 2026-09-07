// tests/pages/DashboardPage.js — replaces old Dpage.js.
// USE: all /home feed tests (DASH-*, INT-*). Create with `new DashboardPage(page)`, then `open()` and use
// `dashboard.header` (search/nav), `dashboard.postModal` (creating), `dashboard.feed` (asserting),
// `dashboard.moodFilter` (moods), `dashboard.sidebar` (topics/contributors), `dashboard.postCard` (interactions).
// `dashboard.moodFilter` (moods), `dashboard.sidebar` (topics/contributors), `dashboard.postCard` (interactions),
// `dashboard.feedback` (bug/idea modal).
import { BasePage } from './BasePage.js';
import { Header } from '../components/Header.js';
import { PostModal } from '../components/PostModal.js';
import { Feed } from '../components/Feed.js';
import { MoodFilter } from '../components/MoodFilter.js';
import { RightSidebar } from '../components/RightSidebar.js';
import { PostCard } from '../components/PostCard.js';
import { BugReportModal } from '../components/BugReportModal.js';

export class DashboardPage extends BasePage {
  // USE: composes the 7 shared pieces + filter banner — specs talk to these, never raw selectors.
  constructor(page) {
    super(page);
    this.header = new Header(page);
    this.postModal = new PostModal(page);
    this.feed = new Feed(page);
    this.moodFilter = new MoodFilter(page);
    this.sidebar = new RightSidebar(page);
    this.postCard = new PostCard(page);
    this.feedback = new BugReportModal(page);
    this.filterBanner = page.getByText(/showing posts (for|by)/i);
    this.clearFilterButton = page.getByRole('button', { name: /clear filter/i });
  }

  // USE: start every dashboard test here. Opens `/home` and waits for async feed load.
  async open() {
    await this.goto('/home');
  }

  // USE: dismiss an active tag/contributor filter. Used at the end of DASH-F4/F5.
  async clearFilter() {
    await this.clearFilterButton.click();
  }
}

// Backwards-compatible alias.
export { DashboardPage as Dpage };
