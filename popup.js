// DOM Elements - Views
const setupView = document.getElementById('setup-view');
const projectView = document.getElementById('project-view');
const taskView = document.getElementById('task-view');
const profileView = document.getElementById('profile-view');

// DOM Elements - Setup View
const domainInput = document.getElementById('domain-input');
const apiKeyInput = document.getElementById('api-key-input');
const toggleApiKeyBtn = document.getElementById('toggle-api-key');
const saveBtn = document.getElementById('save-btn');
const saveSpinner = document.getElementById('save-spinner');

// DOM Elements - Project View
const profileProjectBtn = document.getElementById('profile-project-btn');
const accountLabelProject = document.getElementById('account-label-project');
const projectSearch = document.getElementById('project-search');
const projectList = document.getElementById('project-list');
const projectsLoadingState = document.getElementById('projects-loading-state');

// DOM Elements - Task View
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const activeProjectName = document.getElementById('active-project-name');
const emailBadge = document.getElementById('email-badge');
const profileTaskBtn = document.getElementById('profile-task-btn');
const todolistSelect = document.getElementById('todolist-select');
const openPhBtn = document.getElementById('open-ph-btn');
const assigneeSelect = document.getElementById('assignee-select');
const statusSelect = document.getElementById('status-select');
const labelSelect = document.getElementById('label-select');
const taskTitleInput = document.getElementById('task-title');
const taskDescTextarea = document.getElementById('task-desc');
const createTaskBtn = document.getElementById('create-task-btn');

// DOM Elements - Profile View
const backFromProfileBtn = document.getElementById('back-from-profile-btn');
const profileDomainInput = document.getElementById('profile-domain-input');
const profileApiKeyInput = document.getElementById('profile-api-key-input');
const toggleProfileApiKeyBtn = document.getElementById('toggle-profile-api-key');
const saveProfileBtn = document.getElementById('save-profile-btn');
const saveProfileSpinner = document.getElementById('save-profile-spinner');
const logoutBtn = document.getElementById('logout-btn');

// DOM Elements - Spinners
const todolistsLoading = document.getElementById('todolists-loading');
const peopleLoading = document.getElementById('people-loading');
const labelsLoading = document.getElementById('labels-loading');
const createTaskSpinner = document.getElementById('create-task-spinner');

// DOM Elements - Alerts
const alertBanner = document.getElementById('alert-banner');
const closeAlertBtn = document.getElementById('close-alert');

// State Variables
let storedApiKey = '';
let storedDomain = '';
let allProjects = [];
let pinnedProjectIds = [];
let selectedProjectId = '';
let selectedProjectName = '';
let previousView = 'project';


// Helper: Sanitize and clean domain input
function cleanDomain(input) {
  let domain = input.trim();
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');
  domain = domain.split('/')[0];
  if (domain && !domain.includes('.')) {
    domain += '.proofhub.com';
  }
  return domain;
}

// Helper: Extract last numeric identifier from a path or string
function cleanId(val) {
  if (typeof val === 'number') return val;
  if (!val) return '';
  const str = String(val);
  const matches = str.match(/\d+/g);
  return matches ? matches[matches.length - 1] : str;
}

// Helper: Attempt multiple URL targets sequentially and return the first valid JSON response
async function fetchWithFallback(urls, options) {
  let lastError = null;
  for (const url of urls) {
    try {
      console.log('Trying API endpoint:', url);
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return { data, url };
      } catch (e) {
        throw new Error('Response is not valid JSON');
      }
    } catch (err) {
      console.warn(`Endpoint failed (${url}):`, err.message);
      lastError = err;
    }
  }
  throw lastError || new Error('All connection attempts failed');
}

// Helper: Resolve template URLs
function resolveUrl(template, placeholder, value) {
  const token = `{${placeholder}}`;
  const idx = template.indexOf(token);
  if (idx === -1) return template;
  
  let valStr = String(value);
  if (idx > 0 && template[idx - 1] !== '/' && !valStr.startsWith('/')) {
    valStr = '/' + valStr;
  }
  return template.replace(token, valStr);
}


// Helper: Headers
function getHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': 'ProofHubQuickTaskExtension/1.0'
  };
}

// Initial Extension Load
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  // Load stored configuration
  chrome.storage.local.get([
    'proofhub_api_key', 
    'proofhub_domain', 
    'proofhub_pinned_projects',
    'proofhub_last_project_id',
    'proofhub_last_project_name',
    'proofhub_last_todolist_id'
  ], async (result) => {
    storedApiKey = result.proofhub_api_key || '';
    storedDomain = result.proofhub_domain || '';
    pinnedProjectIds = result.proofhub_pinned_projects || [];
    
    if (storedApiKey && storedDomain) {
      accountLabelProject.textContent = storedDomain;
      
      const lastProjId = result.proofhub_last_project_id;
      const lastProjName = result.proofhub_last_project_name;
      const lastListId = result.proofhub_last_todolist_id;
      
      // "Remember the selection" logic: if previously selected list & project exists
      if (lastProjId && lastListId) {
        selectedProjectId = lastProjId;
        selectedProjectName = lastProjName || `Project #${lastProjId}`;
        activeProjectName.textContent = selectedProjectName;
        
        showView('task');
        await loadTaskFormState(lastProjId, lastListId);
      } else {
        showView('project');
        await fetchAndRenderProjects();
      }
    } else {
      showView('setup');
    }
  });
});

// Event Listeners setup
function setupEventListeners() {
  // Eye icon visibility toggle
  toggleApiKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    const svg = toggleApiKeyBtn.querySelector('svg');
    if (isPassword) {
      svg.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    } else {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    }
  });

  // Setup Save Action
  saveBtn.addEventListener('click', handleConnectAccount);
  
  // Setup inputs enter keys
  domainInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConnectAccount(); });
  apiKeyInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleConnectAccount(); });

  // Profile Navigation Buttons
  profileProjectBtn.addEventListener('click', () => openProfileView('project'));
  profileTaskBtn.addEventListener('click', () => openProfileView('task'));
  backFromProfileBtn.addEventListener('click', () => showView(previousView));

  // Toggle API Key visibility in Profile View
  toggleProfileApiKeyBtn.addEventListener('click', () => {
    const isPassword = profileApiKeyInput.type === 'password';
    profileApiKeyInput.type = isPassword ? 'text' : 'password';
    const svg = toggleProfileApiKeyBtn.querySelector('svg');
    if (isPassword) {
      svg.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    } else {
      svg.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    }
  });

  // Save changes in Profile
  saveProfileBtn.addEventListener('click', handleSaveProfileChanges);
  
  // Danger Zone - Log Out
  logoutBtn.addEventListener('click', handleDisconnect);

  // Search filter box
  projectSearch.addEventListener('input', () => {
    renderProjectsList(allProjects);
  });

  // Back Navigation
  backToProjectsBtn.addEventListener('click', async () => {
    // Clear selection cache to prevent auto-forward next open
    chrome.storage.local.remove(['proofhub_last_project_id', 'proofhub_last_project_name', 'proofhub_last_todolist_id'], () => {
      selectedProjectId = '';
      selectedProjectName = '';
      showView('project');
      fetchAndRenderProjects();
    });
  });

  // Add Task list selections change triggers
  todolistSelect.addEventListener('change', () => {
    const listId = todolistSelect.value;
    if (listId && selectedProjectId) {
      openPhBtn.disabled = false;
      // Save last selected todolist for caching
      chrome.storage.local.set({
        proofhub_last_project_id: selectedProjectId,
        proofhub_last_project_name: selectedProjectName,
        proofhub_last_todolist_id: listId
      });
    } else {
      openPhBtn.disabled = true;
    }
    validateForm();
  });

  // Form input validation checkers
  taskTitleInput.addEventListener('input', validateForm);

  // Submit Action
  createTaskBtn.addEventListener('click', handleCreateTask);

  // Open PH External Link clicker
  openPhBtn.addEventListener('click', () => {
    const listId = todolistSelect.value;
    if (storedDomain && selectedProjectId && listId) {
      const url = `https://${storedDomain}/bappswift/#app/todos/project-${selectedProjectId}/list-${listId}`;
      chrome.tabs.create({ url });
    }
  });

  closeAlertBtn.addEventListener('click', hideAlert);
}

// Router between views
function showView(viewName) {
  setupView.classList.remove('active');
  projectView.classList.remove('active');
  taskView.classList.remove('active');
  profileView.classList.remove('active');

  if (viewName === 'setup') {
    setupView.classList.add('active');
  } else if (viewName === 'project') {
    projectView.classList.add('active');
  } else if (viewName === 'task') {
    taskView.classList.add('active');
  } else if (viewName === 'profile') {
    profileView.classList.add('active');
  }
}

// Open Profile view and cache previous view
function openProfileView(viewName) {
  previousView = viewName;
  profileDomainInput.value = storedDomain;
  profileApiKeyInput.value = storedApiKey;
  showView('profile');
}

// Save updated credentials from Profile View
async function handleSaveProfileChanges() {
  const domainRaw = profileDomainInput.value.trim();
  const apiKey = profileApiKeyInput.value.trim();

  if (!domainRaw) {
    showAlert('Please enter a ProofHub domain.', 'error');
    return;
  }
  if (!apiKey) {
    showAlert('Please enter an API Key.', 'error');
    return;
  }

  const domain = cleanDomain(domainRaw);
  setLoadingState(saveProfileBtn, true, 'save-profile-spinner');

  try {
    const urls = [
      `https://${domain}`,
      `https://${domain}/api/v3/projects`,
      `https://${domain}/api/v3/projects.json`,
      `https://${domain}/projects.json`
    ];

    // Validate key by attempting to fetch projects using fallback endpoints
    await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(apiKey)
    });

    // Save configurations
    chrome.storage.local.set({
      proofhub_api_key: apiKey,
      proofhub_domain: domain
    }, async () => {
      storedApiKey = apiKey;
      storedDomain = domain;
      accountLabelProject.textContent = domain;
      
      showAlert('Profile updated successfully!', 'success');
      showView(previousView);
      
      // If we went back to project list, reload it
      if (previousView === 'project') {
        await fetchAndRenderProjects();
      } else if (previousView === 'task') {
        // If we went back to task view, reload the task view resources for the selected project
        await loadTaskFormState(selectedProjectId);
      }
    });

  } catch (err) {
    console.error('Profile update validation error:', err);
    showAlert(err.message || 'Failed to update. Verify credentials.', 'error');
  } finally {
    setLoadingState(saveProfileBtn, false, 'save-profile-spinner');
  }
}


// Alert banner display
function showAlert(message, type = 'success') {
  const messageEl = alertBanner.querySelector('.alert-message');
  messageEl.textContent = message;
  alertBanner.className = `alert-banner visible ${type}`;
  if (type === 'success') {
    setTimeout(hideAlert, 4000);
  }
}

function hideAlert() {
  alertBanner.classList.remove('visible');
}

// Setup logic: Save credentials
async function handleConnectAccount() {
  const domainRaw = domainInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!domainRaw) {
    showAlert('Please enter a ProofHub domain.', 'error');
    return;
  }
  if (!apiKey) {
    showAlert('Please enter an API Key.', 'error');
    return;
  }

  const domain = cleanDomain(domainRaw);
  setLoadingState(saveBtn, true, 'save-spinner');

  try {
    const urls = [
      `https://${domain}`,
      `https://${domain}/api/v3/projects`,
      `https://${domain}/api/v3/projects.json`,
      `https://${domain}/projects.json`
    ];

    // Validate key by attempting to fetch projects using fallback endpoints
    await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(apiKey)
    });

    // Save configurations
    chrome.storage.local.set({
      proofhub_api_key: apiKey,
      proofhub_domain: domain
    }, async () => {
      storedApiKey = apiKey;
      storedDomain = domain;
      accountLabelProject.textContent = domain;
      showView('project');
      await fetchAndRenderProjects();
      showAlert('Account connected!', 'success');
    });

  } catch (err) {
    console.error('Connection validation error:', err);
    showAlert(err.message || 'Failed to connect. Check credentials.', 'error');
  } finally {
    setLoadingState(saveBtn, false, 'save-spinner');
  }
}


// Disconnect/Logout Action
function handleDisconnect() {
  chrome.storage.local.remove([
    'proofhub_api_key',
    'proofhub_domain',
    'proofhub_last_project_id',
    'proofhub_last_project_name',
    'proofhub_last_todolist_id'
  ], () => {
    storedApiKey = '';
    storedDomain = '';
    selectedProjectId = '';
    selectedProjectName = '';
    
    // Clear inputs
    apiKeyInput.value = '';
    domainInput.value = '';
    projectSearch.value = '';
    projectSelectReset();
    
    showView('setup');
    showAlert('Account disconnected.', 'success');
  });
}

function projectSelectReset() {
  projectList.innerHTML = '';
  todolistSelect.innerHTML = '<option value="" disabled selected>Select a task list</option>';
  todolistSelect.disabled = true;
  assigneeSelect.innerHTML = '<option value="" selected>Unassigned</option>';
  assigneeSelect.disabled = true;
  labelSelect.innerHTML = '<option value="" selected>No Label</option>';
  labelSelect.disabled = true;
  openPhBtn.disabled = true;
  taskTitleInput.value = '';
  taskDescTextarea.value = '';
  emailBadge.classList.remove('visible');
}

// Fetch Projects List (View 2)
async function fetchAndRenderProjects() {
  if (!storedDomain || !storedApiKey) return;

  projectsLoadingState.classList.remove('hidden');
  projectList.innerHTML = '';
  
  try {
    const urls = [
      `https://${storedDomain}`,
      `https://${storedDomain}/api/v3/projects`,
      `https://${storedDomain}/api/v3/projects.json`,
      `https://${storedDomain}/projects.json`
    ];

    const { data: projects } = await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(storedApiKey)
    });

    if (Array.isArray(projects)) {
      allProjects = projects;
      renderProjectsList(allProjects);
    } else {
      throw new Error('Projects response format invalid.');
    }
  } catch (err) {
    console.error('Fetch projects error:', err);
    showAlert('Error loading projects: ' + err.message, 'error');
    projectList.innerHTML = '<div class="loading-state">Failed to load projects.</div>';
  } finally {
    projectsLoadingState.classList.add('hidden');
  }
}


// Render dynamic list of projects with pinning and filter matching
function renderProjectsList(projects) {
  projectList.innerHTML = '';
  const filterText = projectSearch.value.trim().toLowerCase();

  // Match search filter
  let filtered = projects.filter(p => {
    const name = (p.name || p.title || '').toLowerCase();
    return name.includes(filterText);
  });

  if (filtered.length === 0) {
    projectList.innerHTML = '<div class="loading-state">No matching projects found.</div>';
    return;
  }

  // Sort: pinned projects first, then alphabetically
  filtered.sort((a, b) => {
    const aPinned = pinnedProjectIds.includes(String(a.id));
    const bPinned = pinnedProjectIds.includes(String(b.id));
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const nameA = (a.name || a.title || '').toLowerCase();
    const nameB = (b.name || b.title || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Render elements
  filtered.forEach(project => {
    const pIdStr = String(project.id);
    const isPinned = pinnedProjectIds.includes(pIdStr);
    
    const row = document.createElement('div');
    row.className = 'project-row';
    
    // Project info column
    const info = document.createElement('div');
    info.className = 'project-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'project-name';
    nameSpan.textContent = project.name || project.title || `Project #${project.id}`;
    
    const metaSpan = document.createElement('span');
    metaSpan.className = 'project-meta';
    metaSpan.textContent = `ID: ${project.id}`;
    
    info.appendChild(nameSpan);
    info.appendChild(metaSpan);
    
    // Click selection
    info.addEventListener('click', () => {
      selectedProjectId = project.id;
      selectedProjectName = project.name || project.title || `Project #${project.id}`;
      activeProjectName.textContent = selectedProjectName;
      showView('task');
      loadTaskFormState(project.id);
    });

    // Pin Button column
    const pinBtn = document.createElement('button');
    pinBtn.className = `pin-btn ${isPinned ? 'pinned' : ''}`;
    pinBtn.title = isPinned ? 'Unpin project' : 'Pin project';
    pinBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="${isPinned ? 'currentColor' : 'none'}" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    `;
    
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent row click select
      togglePinProject(pIdStr);
    });

    row.appendChild(info);
    row.appendChild(pinBtn);
    projectList.appendChild(row);
  });
}

// Toggle project pinning storage
function togglePinProject(projectIdStr) {
  const idx = pinnedProjectIds.indexOf(projectIdStr);
  if (idx > -1) {
    pinnedProjectIds.splice(idx, 1);
  } else {
    pinnedProjectIds.push(projectIdStr);
  }

  chrome.storage.local.set({ proofhub_pinned_projects: pinnedProjectIds }, () => {
    renderProjectsList(allProjects);
  });
}

// Fetch all task sub-resources and populate task view
async function loadTaskFormState(projectId, cachedListId = null) {
  // Clear prior selections
  todolistSelect.innerHTML = '<option value="" disabled selected>Select a task list</option>';
  todolistSelect.disabled = true;
  assigneeSelect.innerHTML = '<option value="" selected>Unassigned</option>';
  assigneeSelect.disabled = true;
  labelSelect.innerHTML = '<option value="" selected>No Label</option>';
  labelSelect.disabled = true;
  openPhBtn.disabled = true;

  taskTitleInput.value = '';
  taskDescTextarea.value = '';

  // Trigger parallel API loading
  await Promise.all([
    fetchTaskLists(projectId, cachedListId),
    fetchPeople(projectId),
    fetchLabels()
  ]);

  // Handle email inputs injection
  await detectAndInjectEmailContext();
}

// Fetch project task lists (todolists)
async function fetchTaskLists(projectId, cachedListId = null) {
  todolistsLoading.classList.remove('hidden');
  try {
    const urls = [
      resolveUrl(`https://${storedDomain}{project_id}/task_lists.json`, 'project_id', projectId),
      `https://${storedDomain}/api/v3/projects/${cleanId(projectId)}/todolists`,
      `https://${storedDomain}/api/v3/projects/${cleanId(projectId)}/todolists.json`,
      `https://${storedDomain}/projects/${cleanId(projectId)}/task_lists.json`
    ];
    
    const { data: lists } = await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(storedApiKey)
    });

    todolistSelect.innerHTML = '<option value="" disabled selected>Select a task list</option>';

    if (Array.isArray(lists) && lists.length > 0) {
      lists.forEach(list => {
        const option = document.createElement('option');
        option.value = list.id;
        option.textContent = list.title || list.name || `List #${list.id}`;
        
        // Auto-select if matches cached todolist
        if (cachedListId && String(list.id) === String(cachedListId)) {
          option.selected = true;
        }
        todolistSelect.appendChild(option);
      });
      todolistSelect.disabled = false;
      
      if (todolistSelect.value) {
        openPhBtn.disabled = false;
      }
    } else {
      todolistSelect.innerHTML = '<option value="" disabled>No task lists found</option>';
    }
  } catch (err) {
    console.error('Task lists fetch error:', err);
    showAlert('Error fetching task lists: ' + err.message, 'error');
  } finally {
    todolistsLoading.classList.add('hidden');
    validateForm();
  }
}

// Fetch project members (people)
async function fetchPeople(projectId) {
  peopleLoading.classList.remove('hidden');
  try {
    const urls = [
      resolveUrl(`https://${storedDomain}{project_id}/people.json`, 'project_id', projectId),
      `https://${storedDomain}/api/v3/projects/${cleanId(projectId)}/people`,
      `https://${storedDomain}/api/v3/people`,
      `https://${storedDomain}/api/v3/people.json`
    ];
    
    const { data: people } = await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(storedApiKey)
    });

    assigneeSelect.innerHTML = '<option value="" selected>Unassigned</option>';

    if (Array.isArray(people) && people.length > 0) {
      people.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.name || person.email || `Member #${person.id}`;
        assigneeSelect.appendChild(option);
      });
      assigneeSelect.disabled = false;
    } else {
      assigneeSelect.innerHTML = '<option value="">No members found</option>';
    }
  } catch (err) {
    console.warn('People load warning (non-blocking):', err.message);
  } finally {
    peopleLoading.classList.add('hidden');
  }
}

// Fetch task labels
async function fetchLabels() {
  labelsLoading.classList.remove('hidden');
  
  const fallbackLabels = [
    { id: 1, name: 'High Priority', color: '#ef4444' },
    { id: 2, name: 'Medium Priority', color: '#f59e0b' },
    { id: 3, name: 'Low Priority', color: '#3b82f6' },
    { id: 4, name: 'Bug', color: '#ec4899' },
    { id: 5, name: 'Feature', color: '#10b981' }
  ];

  try {
    const urls = [
      `https://${storedDomain}/labels.json`,
      `https://${storedDomain}/api/v3/labels`,
      `https://${storedDomain}/api/v3/labels.json`
    ];

    const { data: labels } = await fetchWithFallback(urls, {
      method: 'GET',
      headers: getHeaders(storedApiKey)
    });

    populateLabelsDropdown(Array.isArray(labels) ? labels : fallbackLabels);

  } catch (err) {
    console.warn('Labels load endpoint failed. Using fallback catalog list:', err.message);
    populateLabelsDropdown(fallbackLabels);
  } finally {
    labelsLoading.classList.add('hidden');
  }
}


function populateLabelsDropdown(labels) {
  labelSelect.innerHTML = '<option value="" selected>No Label</option>';
  if (labels.length > 0) {
    labels.forEach(lbl => {
      const option = document.createElement('option');
      option.value = lbl.id;
      option.textContent = lbl.name || `Label #${lbl.id}`;
      labelSelect.appendChild(option);
    });
    labelSelect.disabled = false;
  }
}

// Active Tab email context grabber
async function detectAndInjectEmailContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const url = tab.url;
    const isEmail = url.includes('mail.google.com') ||
                    url.includes('outlook.live.com') ||
                    url.includes('outlook.office.com') ||
                    url.includes('outlook.office365.com');

    if (isEmail) {
      emailBadge.classList.add('visible');

      // Execute script in the active tab context to extract DOM elements
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          let subject = '';
          // 1. Try to fetch subject via Gmail / Outlook DOM selectors
          if (window.location.host.includes('mail.google.com')) {
            const gmailSubjectEl = document.querySelector('h2.hP');
            if (gmailSubjectEl) {
              subject = gmailSubjectEl.textContent.trim();
            }
          } else if (window.location.host.includes('outlook')) {
            const outlookSubjectEl = document.querySelector('[role="main"] h1') || 
                                     document.querySelector('.F_66n') || 
                                     document.querySelector('[role="heading"][aria-level="1"]');
            if (outlookSubjectEl) {
              subject = outlookSubjectEl.textContent.trim();
            }
          }

          // 2. Fallback: Parse and clean document title
          if (!subject) {
            let title = document.title || '';
            // Remove Inbox count e.g., "Inbox (5) - " or "Inbox (12) -"
            title = title.replace(/^\([0-9]+\)\s*/, '');
            title = title.replace(/^Inbox\s+\([0-9]+\)\s*-\s*/i, '');
            
            // Remove email addresses and everything after them
            title = title.replace(/\s+-\s+[^@\s]+@[^@\s]+\.[^@\s]+.*/, '');
            // Remove browser/client suffixes
            title = title.replace(/\s+-\s+Gmail$/i, '');
            title = title.replace(/\s+-\s+.*Outlook$/i, '');
            subject = title.trim();
          }

          return {
            subject: subject,
            selection: window.getSelection().toString().trim()
          };
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.warn('Script injection failed, falling back to tab title:', chrome.runtime.lastError.message);
          // Simple tab title clean fallback on error
          if (tab.title) {
            let title = tab.title;
            title = title.replace(/^\([0-9]+\)\s*/, '');
            title = title.replace(/^Inbox\s+\([0-9]+\)\s*-\s*/i, '');
            title = title.replace(/\s+-\s+[^@\s]+@[^@\s]+\.[^@\s]+.*/, '');
            title = title.replace(/\s+-\s+Gmail$/i, '');
            title = title.replace(/\s+-\s+.*Outlook$/i, '');
            taskTitleInput.value = title.trim();
            validateForm();
          }
          return;
        }

        if (results && results[0] && results[0].result) {
          const { subject, selection } = results[0].result;
          if (subject) {
            taskTitleInput.value = subject;
          } else if (tab.title) {
            taskTitleInput.value = tab.title;
          }
          if (selection) {
            taskDescTextarea.value = selection;
          }
          validateForm();
        }
      });
    }
  } catch (err) {
    console.error('Error scraper injection context:', err);
  }
}


// Form fields validator
function validateForm() {
  const hasList = !!todolistSelect.value;
  const hasTitle = !!taskTitleInput.value.trim();
  createTaskBtn.disabled = !(hasList && hasTitle);
}

// Task submission
async function handleCreateTask() {
  const listId = todolistSelect.value;
  const title = taskTitleInput.value.trim();
  const description = taskDescTextarea.value.trim();
  const assigneeVal = assigneeSelect.value;
  const statusVal = statusSelect.value;
  const labelVal = labelSelect.value;

  if (!listId || !title) return;

  setLoadingState(createTaskBtn, true, 'create-task-spinner');

  try {
    const assignees = assigneeVal ? [parseInt(assigneeVal, 10)] : [];
    
    // Configured payload for V3 structures
    const payload = {
      title: title,
      description: description,
      assigned_to: assignees,
      assigned: assignees,
      status: statusVal,
      label_id: labelVal ? parseInt(labelVal, 10) : null
    };

    const urls = [
      resolveUrl(`https://${storedDomain}{list_id}/tasks.json`, 'list_id', listId),
      `https://${storedDomain}/api/v3/projects/${cleanId(selectedProjectId)}/todolists/${cleanId(listId)}/tasks`,
      `https://${storedDomain}/api/v3/todolists/${cleanId(listId)}/tasks`
    ];

    await fetchWithFallback(urls, {
      method: 'POST',
      headers: getHeaders(storedApiKey),
      body: JSON.stringify(payload)
    });

    showAlert('Task added successfully!', 'success');
    
    // Clear inputs (retain selects)
    taskTitleInput.value = '';
    taskDescTextarea.value = '';
    validateForm();

  } catch (err) {
    console.error('Task creation failure:', err);
    showAlert('Error: ' + err.message, 'error');
  } finally {
    setLoadingState(createTaskBtn, false, 'create-task-spinner');
  }
}


// Dynamic button load spinner toggle
function setLoadingState(buttonEl, isLoading, spinnerId = '') {
  const spinner = spinnerId 
    ? document.getElementById(spinnerId) 
    : buttonEl.querySelector('.spinner');
  const span = buttonEl.querySelector('span');

  if (isLoading) {
    buttonEl.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (span) span.style.opacity = '0.7';
  } else {
    buttonEl.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (span) span.style.opacity = '1';
  }
}
