import './styles/main.css';

// Simple animation for buttons
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('mouseover', function() {
        this.style.boxShadow = '0 0 15px rgba(78, 248, 163, 0.7)';
    });
    
    button.addEventListener('mouseout', function() {
        this.style.boxShadow = 'none';
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if(targetId.startsWith('#')) {
            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 100,
                    behavior: 'smooth'
                });
            }
        }
    });
});

console.log('PVA Bazaar - Where Artistry Meets Blockchain');