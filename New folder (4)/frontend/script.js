// Basic SPA tab handling
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(tab).classList.add('active');

    if(tab === 'community') loadCommunity();
  });
});

const analyzeBtn = document.getElementById('analyzeBtn');
analyzeBtn.addEventListener('click', analyze);

async function analyze(){
  const job = document.getElementById('job').value;
  const resume = document.getElementById('resume').value;
  const bias = document.getElementById('biasToggle').checked;
  if(!job || !resume) { alert('Please provide both job description and resume'); return }

  setLoading(true);
  try{
    const res = await fetch('/analyze', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_description:job,resume:resume,bias_free:bias})});
    if(!res.ok){const e = await res.json(); throw new Error(e.error || 'Server error')}
    const data = await res.json();
    showResultUI(data);
  }catch(err){alert(err.message)}
  setLoading(false);
}

function setLoading(on){
  if(on){
    analyzeBtn.innerHTML = 'Analyzing <span class="dot">●</span>';
    analyzeBtn.setAttribute('disabled','');
  } else {
    analyzeBtn.innerHTML = 'Analyze Resume';
    analyzeBtn.removeAttribute('disabled');
  }
}

function showResultUI(data){
  document.getElementById('results').classList.remove('hidden');
  const pct = data.match_percentage || 0;
  const progress = document.getElementById('progress');
  const circumference = 440; // matches CSS
  const offset = Math.round(circumference - (pct/100)*circumference);
  progress.style.transition = 'stroke-dashoffset 800ms cubic-bezier(.2,.9,.3,1)';
  progress.style.strokeDashoffset = offset;
  document.getElementById('scoreText').textContent = pct + '%';
  document.getElementById('scoreHeadline').textContent = pct + '%';

  // show bias badge when enabled
  const badge = document.getElementById('biasBadge');
  if(data.bias_free){ badge.classList.remove('hidden'); badge.textContent = data.bias_note || 'Bias‑Free Evaluation Enabled' } else { badge.classList.add('hidden') }

  // explanations
  const expl = document.getElementById('explanations'); expl.innerHTML = '';
  if(data.missing_skills && data.missing_skills.length){
    expl.innerHTML += '<li>Missing core skills: ' + data.missing_skills.slice(0,3).join(', ') + '.</li>';
    expl.innerHTML += '<li>Consider learning ' + data.missing_skills.slice(0,3).join(' & ') + ' to improve match.</li>';
  } else expl.innerHTML += '<li>No major skill gaps detected.</li>';

  // skills chips
  fillChips('strongSkills', data.matched_skills || [], 'good');
  fillChips('missingSkills', data.missing_skills || [], 'bad');

  // partial skills: for demo, show jd_skills that are not matched as partial if similar
  const jdCount = data.jd_skill_count || 0;
  const resumeCount = data.resume_skill_count || 0;
  const partial = (data.missing_skills || []).slice(0,3);
  fillChips('midSkills', partial, 'mid');

  // soft skills: very simple detection
  const softs = ['problem solving','communication','teamwork','leadership'];
  const foundSoft = softs.filter(s => (document.getElementById('job').value + ' ' + document.getElementById('resume').value).toLowerCase().includes(s));
  fillChips('softSkills', foundSoft.length? foundSoft : ['communication','teamwork'], '');

  // career path recommendations
  generateCareerRecommendations(data.missing_skills || [], data.matched_skills || [], pct);
}

function fillChips(id, items, cls){
  const node = document.getElementById(id); node.innerHTML = '';
  if(!items || !items.length){ node.innerHTML = '<div class="muted">— none —</div>'; return }
  items.forEach(it =>{
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
compareBtn.addEventListener('click', async ()=>{
  const job = document.getElementById('job').value || '';
  const resumes = Array.from(document.querySelectorAll('.compare-resume')).map(t=>t.value||'');
  const bias = document.getElementById('compareBiasToggle').checked;
  if(!job || resumes.length < 2 || resumes.some(r=>!r)){ alert('Please provide job description and both resumes'); return }

  compareBtn.disabled = true; compareBtn.textContent = 'Comparing...';
  try{
    const res = await fetch('/compare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job_description:job,resumes:resumes,bias_free:bias})});
    if(!res.ok){const e=await res.json(); throw new Error(e.error||'Server error')}
    const data = await res.json();

    // Generate balanced comparison explanation
    const candidates = data.candidates || {};
    const candidate1 = candidates.candidate_1;
    const candidate2 = candidates.candidate_2;

    let explanation = `<h4>Resume Comparison Analysis</h4>`;
    explanation += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:20px 0;">`;

    // Resume 1 analysis
    explanation += `<div style="padding:15px;border-radius:10px;background:linear-gradient(180deg, rgba(73,17,28,0.08), rgba(73,17,28,0.04));border:1px solid rgba(73,17,28,0.2);">`;
    explanation += `<strong>Resume 1</strong><br>`;
    explanation += `Match Score: <strong>${candidate1.score}%</strong><br>`;
    if(candidate1.matched_skills.length > 0){
      explanation += `Key Strengths: ${candidate1.matched_skills.slice(0,3).join(', ')}<br>`;
    }
    explanation += `Skills Count: ${candidate1.skill_count}`;
    explanation += `</div>`;

    // Resume 2 analysis
    explanation += `<div style="padding:15px;border-radius:10px;background:linear-gradient(180deg, rgba(73,17,28,0.08), rgba(73,17,28,0.04));border:1px solid rgba(73,17,28,0.2);">`;
    explanation += `<strong>Resume 2</strong><br>`;
    explanation += `Match Score: <strong>${candidate2.score}%</strong><br>`;
    if(candidate2.matched_skills.length > 0){
      explanation += `Key Strengths: ${candidate2.matched_skills.slice(0,3).join(', ')}<br>`;
    }
    explanation += `Skills Count: ${candidate2.skill_count}`;
    explanation += `</div>`;

    explanation += `</div>`;

    // Skill comparison analysis
    const skills1 = new Set(candidate1.matched_skills || []);
    const skills2 = new Set(candidate2.matched_skills || []);
    const commonSkills = [...skills1].filter(skill => skills2.has(skill));
    const uniqueTo1 = [...skills1].filter(skill => !skills2.has(skill));
    const uniqueTo2 = [...skills2].filter(skill => !skills1.has(skill));

    explanation += `<h4>Skill Comparison</h4>`;
    explanation += `<div style="background: rgba(255,255,255,0.02); padding: 15px; border-radius: 10px; margin: 15px 0;">`;

    if(commonSkills.length > 0){
      explanation += `<div style="margin-bottom:10px;"><strong>Common Skills:</strong> <span style="color:#22c55e">${commonSkills.join(', ')}</span></div>`;
    }

    if(uniqueTo1.length > 0 || uniqueTo2.length > 0){
      explanation += `<strong>Unique Advantages:</strong><br>`;
      if(uniqueTo1.length > 0){
        explanation += `• Resume 1 has unique skills: <span style="color:#f59e0b">${uniqueTo1.join(', ')}</span><br>`;
      }
      if(uniqueTo2.length > 0){
        explanation += `• Resume 2 has unique skills: <span style="color:#f59e0b">${uniqueTo2.join(', ')}</span><br>`;
      }
    }

    explanation += `</div>`;

    // Balanced analysis
    const scoreDiff = Math.abs(candidate1.score - candidate2.score);
    const higherScoreCandidate = candidate1.score > candidate2.score ? "Resume 1" : candidate2.score > candidate1.score ? "Resume 2" : null;

    if(scoreDiff <= 5){
      explanation += `<strong>Analysis:</strong> Both resumes show similar match potential (${candidate1.score}% vs ${candidate2.score}%). Consider reviewing experience level, project complexity, and cultural fit for final decision.<br><br>`;
    } else if(higherScoreCandidate){
      const uniqueSkills = higherScoreCandidate === "Resume 1" ? uniqueTo1 : uniqueTo2;
      explanation += `<strong>Analysis:</strong> ${higherScoreCandidate} shows stronger alignment with ${Math.max(candidate1.score, candidate2.score)}% match vs ${Math.min(candidate1.score, candidate2.score)}%. `;
      if(uniqueSkills.length > 0){
        explanation += `Key differentiators include: ${uniqueSkills.slice(0,2).join(', ')}. `;
      }
      explanation += `However, both candidates may bring valuable skills to the role.<br><br>`;
    }

    explanation += `<strong>Recommendation:</strong> Review both candidates holistically considering skills, experience, and overall fit for your specific needs.`;

    document.getElementById('comparisonText').innerHTML = explanation;
    document.getElementById('compareResults').classList.remove('hidden');

  }catch(err){alert(err.message)}
  compareBtn.disabled = false; compareBtn.textContent = 'Compare Resumes';
});

// Action buttons for analysis results
document.getElementById('downloadReportBtn').addEventListener('click', () => {
  const job = document.getElementById('job').value;
  const resume = document.getElementById('resume').value;
  const matchPercent = document.querySelector('.score-number')?.textContent || 'N/A';
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
async function loadCommunity(){
  const resp = await fetch('/community');
  if(!resp.ok) return;
  const data = await resp.json();
  const grid = document.querySelector('.community-grid');
  grid.innerHTML = '';
  data.cards.forEach(c=>{
    const div = document.createElement('div'); div.className='card feature';
    let buttonHTML = `<button class="btn-ghost">${c.button || 'Explore'}</button>`;
    if(c.title === 'Resume Tips'){
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://www.coursera.org/articles/resume-tips', '_blank')">Explore</button>`;
    } else if(c.title === 'Peer Learning'){
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://chat.whatsapp.com/Fm5RhGgSYY71xT4XTMDLVy', '_blank')">Join</button>`;
    } else if(c.title === 'Career Insights'){
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://www.spacetalent.org/resources/best-career-exploration-websites', '_blank')">Explore</button>`;
    } else if(c.title === 'Interview Prep'){
      buttonHTML = `<button class="btn-ghost" onclick="window.open('https://scaler.com/ai-mock-interview', '_blank')">Start</button>`;
    }
    div.innerHTML = `<h4>${c.title}</h4><p>${c.summary}</p>${buttonHTML}`;
    grid.appendChild(div);
  })
}

// init: set default visuals
document.addEventListener('DOMContentLoaded', ()=>{
  // set initial dashoffset
  document.getElementById('progress').style.strokeDashoffset = 440;
});
