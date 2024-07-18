const colorsJSON = `{
    "colors": ["#4FF0E6", "#51CCAA", "#EDE663", "#ED5E58", "#881B33", "#74287D"]
}`;

function createColorSquares() {
    const container = document.getElementById('squaresContainer');
    const colors = JSON.parse(colorsJSON).colors;
    for (let i = 0; i < colors.length; i++) {
        const square = document.createElement('div');
        square.className = 'square';
        square.style.backgroundColor = colors[i];
        container.appendChild(square);
    }
}