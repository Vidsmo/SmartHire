// Basic SPA tab handling
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(tab).classList.add('active');

    if (tab === 'community') loadCommunity();
    if (tab === 'onboarding') initOnboarding();
    if (tab === 'docs') initDocs();
  });
});

const analyzeBtn = document.getElementById('analyzeBtn');
analyzeBtn.addEventListener('click', analyze);

async function analyze() {
  const job = document.getElementById('job').value;
  const resume = document.getElementById('resume').value;
  if (!job || !resume) { alert('Please provide both job description and resume'); return }

  setLoading(true);
  try {
    const res = await fetch('/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_description: job, resume: resume }) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Server error') }
    const data = await res.json();
    showResultUI(data);
  } catch (err) { alert(err.message) }
  setLoading(false);
}

function setLoading(on) {
  if (on) {
    analyzeBtn.innerHTML = 'Analyzing <span class="dot">●</span>';
    analyzeBtn.setAttribute('disabled', '');
  } else {
    analyzeBtn.innerHTML = 'Analyze Resume';
    analyzeBtn.removeAttribute('disabled');
  }
}

function showResultUI(data) {
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('analyzeWelcome')?.classList.add('hidden');
  const pct = data.match_percentage || 0;
  const progress = document.getElementById('progress');
  const circumference = 440; // matches CSS
  const offset = Math.round(circumference - (pct / 100) * circumference);
  progress.style.transition = 'stroke-dashoffset 800ms cubic-bezier(.2,.9,.3,1)';
  progress.style.strokeDashoffset = offset;
  document.getElementById('scoreText').textContent = pct + '%';
  document.getElementById('scoreHeadline').textContent = pct + '%';



  // explanations
  const expl = document.getElementById('explanations'); expl.innerHTML = '';
  if (data.missing_skills && data.missing_skills.length) {
    expl.innerHTML += '<li>Missing core skills: ' + data.missing_skills.slice(0, 3).join(', ') + '.</li>';
    expl.innerHTML += '<li>Consider learning ' + data.missing_skills.slice(0, 3).join(' & ') + ' to improve match.</li>';
  } else expl.innerHTML += '<li>No major skill gaps detected.</li>';

  // skills chips
  fillChips('strongSkills', data.matched_skills || [], 'good');
  fillChips('missingSkills', data.missing_skills || [], 'bad');

  // partial skills: for demo, show jd_skills that are not matched as partial if similar
  const jdCount = data.jd_skill_count || 0;
  const resumeCount = data.resume_skill_count || 0;
  const partial = (data.missing_skills || []).slice(0, 3);
  fillChips('midSkills', partial, 'mid');

  // soft skills: very simple detection
  const softs = ['problem solving', 'communication', 'teamwork', 'leadership'];
  const foundSoft = softs.filter(s => (document.getElementById('job').value + ' ' + document.getElementById('resume').value).toLowerCase().includes(s));
  fillChips('softSkills', foundSoft.length ? foundSoft : ['communication', 'teamwork'], '');

  // career path recommendations
  generateCareerRecommendations(data.missing_skills || [], data.matched_skills || [], pct);

  // AI Insights
  const aiInsights = document.getElementById('aiInsightsContainer');
  if (data.ai_insights) {
    aiInsights.classList.remove('hidden');
    document.getElementById('aiInsightsText').textContent = data.ai_insights;
  } else {
    aiInsights.classList.add('hidden');
  }

  // Generate AI Interview Questions
  generateAIQuestions();

  // Render Premium Charts
  renderCharts(data.extra_metrics || {});
}

let skillChartInstance = null;
function renderCharts(metrics) {
  const ctx = document.getElementById('skillChart').getContext('2d');

  if (skillChartInstance) skillChartInstance.destroy();

  const labels = ['Technical Alignment', 'Culture Fit', 'Growth Potential', 'Soft Skills', 'Experience Depth'];
  const values = [
    Math.min(10, metrics.culture_fit || 7),
    metrics.culture_fit || 7,
    metrics.potential || 8,
    8,
    7
  ];

  skillChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Candidate Score',
        data: values,
        fill: true,
        backgroundColor: 'rgba(73, 17, 28, 0.2)',
        borderColor: '#49111C',
        pointBackgroundColor: '#49111C',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#49111C'
      }]
    },
    options: {
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#A9927D', font: { size: 12 } },
          ticks: { display: false, stepSize: 2 },
          suggestedMin: 0,
          suggestedMax: 10
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

function fillChips(id, items, cls) {
  const node = document.getElementById(id); node.innerHTML = '';
  if (!items || !items.length) { node.innerHTML = '<div class="muted">— none —</div>'; return }
  items.forEach(it => {
    const div = document.createElement('div'); div.className = 'chip ' + (cls || ''); div.textContent = it; node.appendChild(div);
  })
}

function generateCareerRecommendations(missingSkills, matchedSkills, currentMatch) {
  const recommendationsDiv = document.getElementById('careerRecommendations');
  recommendationsDiv.innerHTML = '';

  if (!missingSkills || missingSkills.length === 0) {
    recommendationsDiv.innerHTML = `
      <div class="career-success">
        <div class="success-icon">🎉</div>
        <h3>Excellent Match!</h3>
        <p>Your skills are perfectly aligned with this role. Consider advancing to senior-level positions or exploring specialized certifications.</p>
        <div class="next-steps">
          <div class="step">
            <div class="step-icon">🏆</div>
            <div class="step-content">
              <strong>Senior Role</strong><br>
              Lead projects and mentor juniors
            </div>
          </div>
          <div class="step">
            <div class="step-icon">📜</div>
            <div class="step-content">
              <strong>Certifications</strong><br>
              Industry-recognized credentials
            </div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // Create visual career path roadmap
  recommendationsDiv.innerHTML = `
    <div class="career-roadmap">
      <h3>🚀 Your Career Development Roadmap</h3>

      <!-- Current Status -->
      <div class="roadmap-stage current">
        <div class="stage-icon">📍</div>
        <div class="stage-content">
          <h4>Current Level</h4>
          <div class="skill-status">
            <div class="known-skills">
              <strong>✅ Mastered:</strong> ${matchedSkills && matchedSkills.length > 0 ? matchedSkills.slice(0, 3).join(', ') : 'Building foundation'}
            </div>
            <div class="current-score">Match Score: <strong>${currentMatch}%</strong></div>
          </div>
        </div>
      </div>

      <!-- Progress Arrow -->
      <div class="progress-arrow">⬇</div>

      <!-- Next Level -->
      <div class="roadmap-stage next">
        <div class="stage-icon">🎯</div>
        <div class="stage-content">
          <h4>Next Level Up</h4>
          <p>Learn these skills to boost your match score</p>
          <div class="skill-progression">
            ${generateSkillProgression(missingSkills, currentMatch)}
          </div>
        </div>
      </div>

      <!-- Future Vision -->
      <div class="progress-arrow">⬇</div>
      <div class="roadmap-stage future">
        <div class="stage-icon">⭐</div>
        <div class="stage-content">
          <h4>Future Potential</h4>
          <p>With these skills, you'll be ready for advanced roles</p>
          <div class="future-roles">
            <span class="role-tag">Senior Developer</span>
            <span class="role-tag">Tech Lead</span>
            <span class="role-tag">Architect</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateSkillProgression(missingSkills, currentMatch) {
  const skillPaths = {
    'python': { path: 'Python Development', impact: 15, level: 'Intermediate' },
    'javascript': { path: 'Full-Stack Development', impact: 18, level: 'Advanced' },
    'java': { path: 'Enterprise Development', impact: 16, level: 'Advanced' },
    'sql': { path: 'Database Management', impact: 12, level: 'Intermediate' },
    'aws': { path: 'Cloud Architecture', impact: 20, level: 'Advanced' },
    'docker': { path: 'DevOps & Containers', impact: 14, level: 'Intermediate' },
    'react': { path: 'Frontend Development', impact: 17, level: 'Advanced' },
    'machine learning': { path: 'AI/ML Engineering', impact: 22, level: 'Expert' },
    'devops': { path: 'DevOps Engineering', impact: 19, level: 'Advanced' },
    'leadership': { path: 'Technical Leadership', impact: 10, level: 'Senior' }
  };

  const topSkills = missingSkills.slice(0, 3);
  let progressionHTML = '';

  topSkills.forEach((skill, index) => {
    const skillKey = skill.toLowerCase();
    const pathInfo = skillPaths[skillKey];

    if (pathInfo) {
      const newMatch = Math.min(100, currentMatch + pathInfo.impact);
      const progressPercent = (pathInfo.impact / 25) * 100; // Assuming max boost of 25%

      progressionHTML += `
        <div class="skill-step" style="animation-delay: ${index * 0.2}s">
          <div class="step-number">${index + 1}</div>
          <div class="step-details">
            <div class="skill-name">Learn ${skill.charAt(0).toUpperCase() + skill.slice(1)}</div>
            <div class="skill-path">${pathInfo.path}</div>
            <div class="skill-boost">
              <span class="boost-text">Score boost: +${pathInfo.impact}%</span>
              <span class="new-score">→ ${newMatch}% match</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="skill-level">${pathInfo.level} Level</div>
          </div>
        </div>
      `;
    }
  });

  return progressionHTML;
}

// Compare
const compareBtn = document.getElementById('compareBtn');

// Helpers to manage candidate cards
function renumberCandidates() {
  document.querySelectorAll('#compareGrid .card.candidate').forEach((card, idx) => {
    const h4 = card.querySelector('h4');
    if (h4) h4.textContent = `Candidate ${idx + 1}`;
  });
}

function createCandidateCard(content = '') {
  const div = document.createElement('div');
  div.className = 'card candidate';
  div.innerHTML = `
    <h4>Candidate</h4>
    <textarea class="compare-resume" placeholder="Paste resume...">${content}</textarea>
    <button class="btn-ghost small remove-candidate" style="margin-top:8px;">Remove</button>
  `;
  return div;
}

// Initialize grid with at least 3 candidates if fewer
(function initCandidateCards() {
  const grid = document.getElementById('compareGrid');
  if (!grid) return;
  if (grid.querySelectorAll('.card.candidate').length < 2) {
    grid.innerHTML = '';
    for (let i = 0; i < 3; i++) grid.appendChild(createCandidateCard());
  }
  renumberCandidates();
})();

// Add / Reset / Remove handlers
const addCompareCandidateBtn = document.getElementById('addCompareCandidateBtn');
if (addCompareCandidateBtn) addCompareCandidateBtn.addEventListener('click', () => {
  const grid = document.getElementById('compareGrid');
  grid.appendChild(createCandidateCard());
  renumberCandidates();
});

const resetCompareCandidatesBtn = document.getElementById('resetCompareCandidatesBtn');
if (resetCompareCandidatesBtn) resetCompareCandidatesBtn.addEventListener('click', () => {
  const grid = document.getElementById('compareGrid');
  grid.innerHTML = '';
  for (let i = 0; i < 3; i++) grid.appendChild(createCandidateCard());
  renumberCandidates();
});

// Delegate removal
const compareGrid = document.getElementById('compareGrid');
if (compareGrid) {
  compareGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-candidate')) {
      const card = e.target.closest('.card.candidate');
      if (card) { card.remove(); renumberCandidates(); }
    }
  });
}

compareBtn.addEventListener('click', async () => {
  const job = document.getElementById('job').value || '';
  const resumes = Array.from(document.querySelectorAll('.compare-resume')).map(t => t.value.trim()).filter(r => r);
  if (!job || resumes.length < 2) { alert('Please provide job description and at least two resumes'); return }

  compareBtn.disabled = true; compareBtn.textContent = 'Comparing...';
  try {
    const res = await fetch('/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_description: job, resumes: resumes }) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Server error') }
    const data = await res.json();

    // Build leaderboard for arbitrary number of candidates
    const candidatesMap = data.candidates || {};
    const candidates = Object.keys(candidatesMap).map((k, idx) => ({ id: k, index: idx + 1, ...candidatesMap[k] }));
    const sorted = candidates.slice().sort((a, b) => (b.score || 0) - (a.score || 0));

    let html = `<h4>Outcome & Leaderboard</h4>`;
    html += `<div style="margin-top:10px;"><ol style="padding-left:18px">`;
    sorted.forEach((c, rank) => {
      html += `<li style="margin-bottom:12px; padding:12px; border-radius:10px; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.04);">`;
      html += `<strong>Rank ${rank + 1} - Candidate ${c.index}</strong> — Score: <strong>${c.score}%</strong><br>`;
      if (c.matched_skills && c.matched_skills.length) html += `Matched: ${c.matched_skills.slice(0, 6).join(', ')}<br>`;
      html += `Skills Count: ${c.skill_count || 0}`;
      html += `</li>`;
    });
    html += `</ol></div>`;

    // Common skills across all candidates
    const skillSets = candidates.map(c => new Set(c.matched_skills || []));
    const common = skillSets.length ? [...skillSets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))] : [];
    if (common.length) html += `<div style="margin-top:12px;"><strong>Common Skills:</strong> ${common.join(', ')}</div>`;

    // Unique skills per candidate
    html += `<div style="margin-top:12px;"><strong>Unique Advantages:</strong><br>`;
    candidates.forEach((c, i) => {
      const others = candidates.filter((_, j) => j !== i);
      const othersSet = new Set([].concat(...others.map(o => o.matched_skills || [])));
      const unique = (c.matched_skills || []).filter(s => !othersSet.has(s));
      if (unique.length) html += `• Candidate ${c.index}: <span style="color:#f59e0b">${unique.slice(0, 4).join(', ')}</span><br>`;
    });
    html += `</div>`;

    document.getElementById('comparisonText').innerHTML = html;
    document.getElementById('compareResults').classList.remove('hidden');

  } catch (err) { alert(err.message) }
  compareBtn.disabled = false; compareBtn.textContent = 'Compare / Rank All';
});



// Action buttons for analysis results
document.getElementById('downloadReportBtn').addEventListener('click', () => {
  const job = document.getElementById('job').value;
  const resume = document.getElementById('resume').value;
  const matchPercent = document.getElementById('scoreText')?.textContent || 'N/A';
  const matchedSkills = Array.from(document.querySelectorAll('#strongSkills .chip')).map(chip => chip.textContent).join(', ');
  const missingSkills = Array.from(document.querySelectorAll('#missingSkills .chip')).map(chip => chip.textContent).join(', ');

  const report = `
SmartHire Resume Analysis Report
Generated on: ${new Date().toLocaleDateString()}

Job Description: ${job.substring(0, 200)}...

Resume Match Score: ${matchPercent}

Matched Skills: ${matchedSkills}
Missing Skills: ${missingSkills}

Career Recommendations: Check the visual roadmap above for detailed skill progression steps.

For more details, visit SmartHire app.
  `.trim();

  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resume-analysis-report.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById('scheduleInterviewBtn').addEventListener('click', () => {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8); display: flex; align-items: center;
    justify-content: center; z-index: 1000; animation: fadeIn 0.3s ease;
  `;

  modal.innerHTML = `
    <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; box-shadow: var(--shadow); animation: slideUp 0.3s ease 0.1s both;">
      <h3 style="margin-top: 0; color: var(--fg); text-align: center;">📅 Schedule Interview</h3>
      <p style="color: var(--secondary); text-align: center; margin-bottom: 25px;">Send interview invitation to shortlisted candidate</p>

      <form id="scheduleForm" style="display: flex; flex-direction: column; gap: 20px;">
        <div>
          <label style="display: block; color: var(--fg); margin-bottom: 8px; font-weight: 600;">Candidate Email</label>
          <input type="email" id="candidateEmail" placeholder="candidate@email.com" required
                 style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--glass); color: var(--fg); font-size: 16px;">
        </div>

        <div>
          <label style="display: block; color: var(--fg); margin-bottom: 8px; font-weight: 600;">Interview Date & Time</label>
          <input type="datetime-local" id="interviewDateTime" required
                 style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--glass); color: var(--fg); font-size: 16px;">
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px;">
          <button type="button" onclick="this.closest('.modal-overlay').remove()"
                  style="padding: 10px 20px; border: 1px solid var(--border); border-radius: 10px; background: transparent; color: var(--fg); cursor: pointer;">Cancel</button>
          <button type="submit" style="padding: 10px 20px; border: none; border-radius: 10px; background: linear-gradient(180deg, var(--primary), rgba(73,17,28,0.8)); color: white; cursor: pointer; font-weight: 600;">Send Invitation</button>
        </div>
      </form>
    </div>
  `;

  modal.className = 'modal-overlay';
  document.body.appendChild(modal);

  // Handle form submission
  document.getElementById('scheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('candidateEmail').value;
    const dateTime = document.getElementById('interviewDateTime').value;

    if (!email || !dateTime) return;

    // Format the date nicely
    const date = new Date(dateTime);
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate email content
    const emailSubject = 'Your Resume Has Been Shortlisted - Interview Invitation';
    const emailBody = `Dear Candidate,

Congratulations! Your resume has been shortlisted for the position.

We would like to schedule an interview with you.

📅 Interview Date & Time: ${formattedDate}

Please confirm your availability by replying to this email.

If this time doesn't work for you, please suggest alternative times.

We look forward to speaking with you!

Best regards,
SmartHire Recruitment Team
    `.trim();

    // Show success message with email preview
    modal.innerHTML = `
      <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 30px; max-width: 500px; width: 90%; box-shadow: var(--shadow); text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
        <h3 style="margin-top: 0; color: var(--fg);">Interview Invitation Sent!</h3>
        <p style="color: var(--secondary); margin-bottom: 20px;">Email sent to: <strong>${email}</strong></p>

        <div style="background: var(--glass); padding: 15px; border-radius: 10px; text-align: left; margin-bottom: 20px; font-family: monospace; font-size: 12px; color: var(--fg);">
          <strong>Subject:</strong> ${emailSubject}<br><br>
          <strong>Body:</strong><br>${emailBody.replace(/\n/g, '<br>')}
        </div>

        <button onclick="navigator.clipboard.writeText('To: ${email}\nSubject: ${emailSubject}\n\n${emailBody}').then(() => alert('Email copied to clipboard!'))"
                style="padding: 10px 20px; border: 1px solid var(--border); border-radius: 10px; background: var(--secondary); color: var(--bg); cursor: pointer; margin-right: 10px;">Copy Email</button>
        <button onclick="this.closest('.modal-overlay').remove()"
                style="padding: 10px 20px; border: none; border-radius: 10px; background: var(--primary); color: white; cursor: pointer;">Close</button>
      </div>
    `;
  });
});

document.getElementById('faqBtn').addEventListener('click', () => {
  const faqModal = document.createElement('div');
  faqModal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.8); display: flex; align-items: center;
    justify-content: center; z-index: 1000;
  `;
  faqModal.innerHTML = `
    <div style="background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 30px; max-width: 600px; max-height: 80vh; overflow-y: auto;">
      <h3 style="margin-top: 0; color: var(--fg);">Frequently Asked Questions</h3>
      <div style="color: var(--fg);">
        <div style="margin-bottom: 20px;">
          <strong>Q: How accurate is the skill matching?</strong><br>
          A: Our AI analyzes keywords and context to provide 85-95% accuracy for technical skills.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: Can I upload PDF resumes?</strong><br>
          A: Currently, paste text content. PDF upload coming in next update.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: What about soft skills?</strong><br>
          A: We detect communication, leadership, and teamwork indicators from resume content.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: How do career recommendations work?</strong><br>
          A: Based on missing skills and industry standards, we suggest learning paths with expected score improvements.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: Is the salary negotiable?</strong><br>
          A: Salary ranges are typically negotiable based on experience, skills, and market conditions. We recommend discussing this during the interview process.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: How many rounds of interviews are there?</strong><br>
          A: Typically 2-4 rounds: Initial screening, technical interview, managerial/HR interview, and final discussion. This varies by company and role.
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Q: How can I connect with the recruiter?</strong><br>
          A: You can connect via email, phone call, or video call (Zoom/Teams). Contact information is usually provided in the interview invitation email.
        </div>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 10px; cursor: pointer;">Close</button>
    </div>
  `;
  document.body.appendChild(faqModal);
});

// Community loader (fetches cards)
async function loadCommunity() {
  const resp = await fetch('/community');
  if (!resp.ok) return;
  const data = await resp.json();
  const grid = document.querySelector('.community-grid');
  grid.innerHTML = '';
  data.cards.forEach(c => {
    const div = document.createElement('div'); div.className = 'card feature';
    let buttonHTML = `<button class="btn-ghost">${c.button || 'Explore'}</button>`;
    if (c.title === 'Resume Tips') {
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://www.coursera.org/articles/resume-tips', '_blank')">Explore</button>`;
    } else if (c.title === 'Career Insights') {
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://www.spacetalent.org/resources/best-career-exploration-websites', '_blank')">Explore</button>`;
    } else if (c.title === 'Interview Prep') {
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://scaler.com/ai-mock-interview', '_blank')">Start</button>`;
    }
    div.innerHTML = `<h4>${c.title}</h4><p>${c.summary}</p>${buttonHTML}`;
    grid.appendChild(div);
  })
}

// init: set default visuals
document.addEventListener('DOMContentLoaded', () => {
  // set initial dashoffset
  document.getElementById('progress').style.strokeDashoffset = 440;

  initAIChat();
});

// AI HR Agent Chat Logic
function initAIChat() {
  const trigger = document.getElementById('chatTrigger');
  const window = document.getElementById('chatWindow');
  const close = document.getElementById('closeChat');
  const input = document.getElementById('chatInput');
  const send = document.getElementById('sendChatBtn');
  const messages = document.getElementById('chatMessages');

  // Ensure chat window is closed initially and only opens on user action
  window.classList.add('hidden');
  trigger.addEventListener('click', () => {
    window.classList.toggle('hidden');
    if (!window.classList.contains('hidden')) input.focus();
  });

  close.addEventListener('click', () => window.classList.add('hidden'));

  send.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    // Add user message to UI
    appendMessage('user', text);
    input.value = '';

    // Add typing indicator
    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.textContent = 'Agent is thinking...';
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;

    try {
      // Get context (JD and Resume)
      const jd = document.getElementById('job').value;
      const resume = document.getElementById('resume').value;
      const context = `Job Description: ${jd.substring(0, 500)}... Candidate Resume: ${resume.substring(0, 500)}...`;

      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: context })
      });

      const data = await res.json();
      typing.remove();

      if (data.response) {
        appendMessage('ai', data.response);
      } else {
        appendMessage('ai', "Sorry, I'm having trouble connecting right now.");
      }
    } catch (err) {
      typing.remove();
      appendMessage('ai', "Error: " + err.message);
    }
  }

  function appendMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
}

// AI Interview Questions
async function generateAIQuestions() {
  const jd = document.getElementById('job').value;
  const resume = document.getElementById('resume').value;
  const list = document.getElementById('aiQuestionsList');
  const card = document.getElementById('aiQuestionsCard');

  if (!jd || !resume) return;

  list.innerHTML = '<div class="muted">Generating targeted questions...</div>';
  card.classList.remove('hidden');

  try {
    const res = await fetch('/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jd, resume: resume })
    });

    const data = await res.json();
    list.innerHTML = '';

    if (data.questions && data.questions.length > 0) {
      data.questions.forEach(q => {
        const div = document.createElement('div');
        div.className = 'question';
        div.textContent = q;
        list.appendChild(div);
      });
    } else {
      list.innerHTML = '<div class="muted">Could not generate questions.</div>';
    }
  } catch (err) {
    list.innerHTML = '<div class="muted">Error: ' + err.message + '</div>';
  }
}

document.getElementById('regenerateQuestionsBtn').addEventListener('click', generateAIQuestions);

// AI Document Generation
document.getElementById('generateDocBtn').addEventListener('click', async () => {
  const type = document.getElementById('docType').value;
  const candName = document.getElementById('docCandName').value;
  const jobInfo = document.getElementById('docJobInfo').value;
  const output = document.getElementById('docOutput');

  if (!candName) { alert('Candidate name is required'); return; }

  output.innerHTML = '<div class="muted">Generating document...</div>';

  try {
    const res = await fetch('/generate-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, candidate_info: candName, job_info: jobInfo })
    });
    const data = await res.json();
    if (data.document) {
      output.textContent = data.document;
    } else {
      output.innerHTML = '<div class="muted">Failed to generate document.</div>';
    }
  } catch (err) {
    output.innerHTML = '<div class="muted">Error: ' + err.message + '</div>';
  }
});

document.getElementById('copyDocBtn').addEventListener('click', () => {
  const text = document.getElementById('docOutput').textContent;
  navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
});

// Onboarding Manager
function generateId() { return 'onb_' + Math.random().toString(36).slice(2,9) }

const ONBOARD_KEY = 'smartHire_onboard_v1';
let onboardState = { candidates: [], selected: null };

function loadOnboarding() {
  try { const raw = localStorage.getItem(ONBOARD_KEY); if (raw) onboardState = JSON.parse(raw); } catch (e) { console.warn('Failed to load onboarding state', e) }
}
function saveOnboarding() { localStorage.setItem(ONBOARD_KEY, JSON.stringify(onboardState)); renderCandidateList(); renderCandidateDetail(); }

function initOnboarding() {
  loadOnboarding();
  renderCandidateList();

  // Wire UI
  document.getElementById('addCandidateBtn').addEventListener('click', () => openCandidateModal());
  document.getElementById('modalCancel').addEventListener('click', closeCandidateModal);
  document.getElementById('modalSave').addEventListener('click', saveCandidateFromModal);
  document.getElementById('candidateSearch').addEventListener('input', renderCandidateList);
  document.getElementById('exportOnboardBtn').addEventListener('click', exportOnboard);
  document.getElementById('importOnboardBtn').addEventListener('click', importOnboard);
  document.getElementById('resetOnboardBtn').addEventListener('click', () => { if (confirm('Reset onboarding data?')) { onboardState = { candidates: [], selected: null }; saveOnboarding(); } });

  // Detail panel actions
  document.getElementById('addTaskBtn').addEventListener('click', () => { const v = document.getElementById('newTaskInput').value.trim(); if (v) { addTask(v); document.getElementById('newTaskInput').value = '' } });
  document.getElementById('startOnboardingBtn').addEventListener('click', () => alert('Onboarding started (mock): sending welcome email and creating calendar invites.'));
  document.getElementById('completeAllBtn').addEventListener('click', () => { if (!onboardState.selected) return; const c = onboardState.candidates.find(x => x.id === onboardState.selected); if (!c) return; c.tasks.forEach(t => t.done = true); saveOnboarding(); });
  document.getElementById('saveNotesBtn').addEventListener('click', () => { if (!onboardState.selected) return; const note = document.getElementById('detailNotes').value; const c = onboardState.candidates.find(x => x.id === onboardState.selected); if (c) { c.notes = note; saveOnboarding(); alert('Notes saved') } });
  document.getElementById('editCandidateBtn').addEventListener('click', () => { if (!onboardState.selected) return openCandidateModal(onboardState.candidates.find(x => x.id === onboardState.selected)) });
  document.getElementById('deleteCandidateBtn').addEventListener('click', () => { if (!onboardState.selected) return; if (!confirm('Delete this candidate?')) return; onboardState.candidates = onboardState.candidates.filter(x => x.id !== onboardState.selected); onboardState.selected = onboardState.candidates.length ? onboardState.candidates[0].id : null; saveOnboarding(); });

  // ensure modal cancel also closes on overlay click
  document.getElementById('candidateModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCandidateModal(); });
}

function renderCandidateList() {
  const list = document.getElementById('candidatesList'); list.innerHTML = '';
  const q = document.getElementById('candidateSearch').value.trim().toLowerCase();
  const items = onboardState.candidates.filter(c => c.name.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q));
  if (!items.length) { list.innerHTML = '<div class="muted" style="padding:18px">No candidates found. Add one to get started.</div>'; return }

  items.forEach(c => {
    const div = document.createElement('div'); div.className = 'candidate-row' + (onboardState.selected === c.id ? ' selected' : '');
    div.innerHTML = `<div class="left"><strong>${c.name}</strong><div class="muted small">${c.role || '—'}</div></div><div class="right"><div class="progress-track tiny"><div class="progress-fill" style="width:${getProgress(c)}%"></div></div><div class="muted small">${getProgress(c)}%</div></div>`;
    div.addEventListener('click', () => { onboardState.selected = c.id; saveOnboarding(); renderCandidateList(); renderCandidateDetail(); });
    list.appendChild(div);
  })
}

function renderCandidateDetail() {
  const panel = document.getElementById('candidateDetail'); const empty = document.getElementById('candidateEmpty');
  if (!onboardState.selected) { panel.classList.add('hidden'); empty.classList.remove('hidden'); return }
  const c = onboardState.candidates.find(x => x.id === onboardState.selected);
  if (!c) { panel.classList.add('hidden'); empty.classList.remove('hidden'); return }

  empty.classList.add('hidden'); panel.classList.remove('hidden');
  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailRole').textContent = `${c.role || '—'} • ${c.tasks.length} tasks`;
  document.getElementById('detailStartDate').textContent = c.startDate ? `Start: ${c.startDate}` : 'Start: —';
  document.getElementById('detailProgressFill').style.width = getProgress(c) + '%';
  document.getElementById('detailProgressText').textContent = `${getProgress(c)}% complete`;
  document.getElementById('detailNotes').value = c.notes || '';

  // tasks
  const tl = document.getElementById('taskList'); tl.innerHTML = '';
  c.tasks.forEach(t => {
    const row = document.createElement('div'); row.className = 'task-row';
    row.innerHTML = `<label class="check-item"><input type="checkbox" data-task-id="${t.id}" ${t.done ? 'checked' : ''}> <span>${t.title}</span></label> <button class="btn-ghost tiny" data-remove="${t.id}">Remove</button>`;
    row.querySelector('input').addEventListener('change', (e) => { t.done = e.target.checked; saveOnboarding(); });
    row.querySelector('[data-remove]')?.addEventListener('click', () => { c.tasks = c.tasks.filter(x => x.id !== t.id); saveOnboarding(); });
    tl.appendChild(row);
  });
}

function openCandidateModal(candidate) {
  const modal = document.getElementById('candidateModal'); modal.classList.remove('hidden');
  document.getElementById('modalTitle').textContent = candidate ? 'Edit Candidate' : 'Add Candidate';
  document.getElementById('modalName').value = candidate?.name || '';
  document.getElementById('modalRole').value = candidate?.role || '';
  document.getElementById('modalStartDate').value = candidate?.startDate || '';
  document.getElementById('modalNotes').value = candidate?.notes || '';
  modal.dataset.editId = candidate?.id || '';
}
function closeCandidateModal() { const modal = document.getElementById('candidateModal'); modal.classList.add('hidden'); delete modal.dataset.editId; }

function saveCandidateFromModal() {
  const id = document.getElementById('candidateModal').dataset.editId;
  const name = document.getElementById('modalName').value.trim(); if (!name) { alert('Name required'); return }
  const role = document.getElementById('modalRole').value.trim(); const startDate = document.getElementById('modalStartDate').value; const notes = document.getElementById('modalNotes').value.trim();
  if (id) {
    const c = onboardState.candidates.find(x => x.id === id); if (c) { c.name = name; c.role = role; c.startDate = startDate; c.notes = notes; }
  } else {
    onboardState.candidates.push({ id: generateId(), name, role, startDate, notes, tasks: [ { id: generateId(), title: 'Background Verification', done: false }, { id: generateId(), title: 'IT Assets Allocation', done: false } ] });
  }
  saveOnboarding(); closeCandidateModal();
}

function getProgress(c) { if (!c || !c.tasks || !c.tasks.length) return 0; const done = c.tasks.filter(t => t.done).length; return Math.round((done / c.tasks.length) * 100); }

function addTask(title) { if (!onboardState.selected) return alert('Select a candidate first'); const c = onboardState.candidates.find(x => x.id === onboardState.selected); if (!c) return; c.tasks.push({ id: generateId(), title, done: false }); saveOnboarding(); }

function exportOnboard() { const data = JSON.stringify(onboardState, null, 2); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'onboarding.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

function importOnboard() { const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json'; input.addEventListener('change', () => { const f = input.files[0]; if (!f) return; const reader = new FileReader(); reader.onload = e => { try { onboardState = JSON.parse(e.target.result); saveOnboarding(); alert('Imported onboarding data'); } catch (err) { alert('Invalid file') } }; reader.readAsText(f); }); input.click(); }

// initialize onboarding when user opens tab
// We leave initOnboarding to be called by tab handler when onboarding is activated


// Simple Checkbox persistent state (Mock)
document.querySelectorAll('.check-item input').forEach(box => {
  box.addEventListener('change', () => {
    const task = box.nextElementSibling.textContent;
    if (box.checked) {
      alert(`Task "${task}" marked as complete!`);
    }
  });
});
