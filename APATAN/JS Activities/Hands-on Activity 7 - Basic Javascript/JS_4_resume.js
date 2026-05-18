// Open resume from overlay
function opensResume() {
    document.getElementById('OpeningOverlayer').classList.add('overlay-fade-out');
    document.getElementById('ResumeContainer').classList.remove('screen-hidden');
}

// "Itago" - Return to overlay
function Widening() {
    document.getElementById('OpeningOverlayer').classList.remove('overlay-fade-out');
    document.getElementById('ResumeContainer').classList.add('screen-hidden');
}

// Theme toggle
function lightnessanddarknessing() {
    var themeButton = document.getElementById('ThemeBUTTON');
    var isLight = document.body.classList.toggle('light-theme');
    themeButton.innerHTML = isLight ? 'Dark Mode' : 'Light Mode';
}

// Section Hide/Show
function HideandshowofSECTIONS(button) {
    var section = button.closest('section');
    if (!section) return;
    var isCollapsed = section.classList.toggle('collapsed');
    button.innerHTML = isCollapsed ? 'Show' : 'Hide';
}