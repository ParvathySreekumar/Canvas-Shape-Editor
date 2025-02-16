
const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const shapes = [];
var thirdVertexX, thirdVertexY, x1, y1, x4, y4, side, radius, radiusx, radiusy, cornerX, cornerY;
let currentShape = null;
let isDrawing = false;
let isCopying = false;
const undoStack = [];
let redoStack = [];
const MAX_UNDO_STACK_SIZE = 10; // undo
let selectedShape = null;
let dragStartX = 0, dragStartY = 0;
let transformMode = null;
let showGrid = true;

function Grid() {
    showGrid = !showGrid; // Toggle the showGrid flag
    draw(); // Redraw the canvas to apply the changes
}



function exportToPDF() {
    if (typeof window.jsPDF === 'undefined') {
        console.error("jsPDF library not loaded yet!");
        return; // Exit the function if jsPDF is not available
    }

    const jsPDF = window.jsPDF;

    const canvas = document.getElementById('myCanvas'); // Replace with your canvas element ID

    // **Ensure canvas dimensions match visual size**
    const canvasRect = canvas.getBoundingClientRect();
    const width = canvasRect.width;
    const height = canvasRect.height;

    // **Capture canvas content with correct MIME type**
    const dataURL = canvas.toDataURL('image/png');

    // **Create and save PDF, handling scaling properly**
    const doc = new jsPDF({
        orientation: 'portrait', // Adjust if needed (e.g., 'landscape')
        unit: 'px',            // Set unit to pixels for accurate scaling
        format: [width + 250, height + 350] // Set PDF dimensions to match canvas
    });

    doc.addImage(dataURL, 'PNG', 0, 0, width, height); // Adjust x, y if needed
    doc.save('my_canvas.pdf');
}




function isPointInShape(x, y, shape) {
    const minX = Math.min(...shape.points.map(p => p.x));
    const maxX = Math.max(...shape.points.map(p => p.x));
    const minY = Math.min(...shape.points.map(p => p.y));
    const maxY = Math.max(...shape.points.map(p => p.y));
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); // Save the current state of the canvas
    ctx.scale(zoomLevel, zoomLevel); // Scale the canvas context
    drawGrid();
    for (const shape of shapes) {
        shape.draw(ctx);
    }
    if (currentShape) {
        currentShape.draw(ctx);
    }
    ctx.restore(); // Restore the canvas state to prevent scaling from affecting other operations
}

function drawGrid() {
    if (showGrid) {
        ctx.save(); // Save the current canvas context state
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 60) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
        }
        for (let y = 0; y < canvas.height; y += 60) {
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
        }
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1; // Set the line width for the grid
        ctx.stroke();
        ctx.restore(); // Restore the saved canvas context state
    }
}


function selectShape(shapeType) {
    console.log("currentShape");
    switch (shapeType) {
        case 'line':
            currentShape = new Line();
            break;
        case 'triangle':
            currentShape = new Triangle();
            break;
        case 'square':
            currentShape = new Square();
            break;
        case 'rectangle':
            currentShape = new Rectangle();
            break;
        case 'circle':
            currentShape = new Circle();
            break;
        case 'ellipse':
            currentShape = new Ellipse();
            break;
        case 'curve':
            currentShape = new Curve();
            break;
        case 'polyline':
            currentShape = new Polyline();
            break;
        case 'polygon':
            currentShape = new Polygon();
            break;
        default:
            currentShape = null;
            break;
    }
}

canvas.addEventListener('mousedown', (event) => {
    const x = event.offsetX;
    const y = event.offsetY;
    dragStartX = x;
    dragStartY = y;

    if (!isCopying) {
        let shapeFound = false;

        // Check if clicking on a shape
        for (const shape of shapes) {
            if (isPointInShape(x, y, shape)) {
                if (selectedShape) {
                    selectedShape.isSelected = false;
                }
                selectedShape = shape;
                selectedShape.isSelected = true;
                shapeFound = true;
                transformMode = null;

                let centerX = (Math.min(...selectedShape.points.map(p => p.x)) + Math.max(...selectedShape.points.map(p => p.x))) / 2;
                let centerY = (Math.min(...selectedShape.points.map(p => p.y)) + Math.max(...selectedShape.points.map(p => p.y))) / 2;
                selectedShape.initialAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;

                if (event.shiftKey) {
                    transformMode = 'scale';  // Activate scale mode if Shift is pressed
                } else if (event.ctrlKey) {
                    transformMode = 'rotate'; // Activate rotate mode if Ctrl is pressed
                } else {
                    transformMode = 'move';   // Default to move mode
                }
                break;
            }
        }

        if (!shapeFound) {
            if (selectedShape) {
                selectedShape.isSelected = false;
            }
            selectedShape = null;
            isDrawing = true;
            selectShape(document.getElementById('shapeSelect').value);
            currentShape.color = document.getElementById('colorSelect').value;
            currentShape.thickness = parseInt(document.getElementById('thicknessSelect').value);
            currentShape.addPoint(x, y);
        }
        draw();
    }
});

canvas.addEventListener('mousemove', (event) => {
    const x = event.offsetX;
    const y = event.offsetY;
    if (selectedShape && transformMode) {
        const dx = x - dragStartX;
        const dy = y - dragStartY;

        switch (transformMode) {
            case 'move':
                selectedShape.move(dx, dy);
                dragStartX = x;
                dragStartY = y;
                break;
            case 'scale':
                const scaleX = 1 + (dx / canvas.width);
                const scaleY = 1 + (dy / canvas.height);
                selectedShape.scale(scaleX, scaleY);
                break;
            case 'rotate':

                let centerX = (Math.min(...selectedShape.points.map(p => p.x)) + Math.max(...selectedShape.points.map(p => p.x))) / 2;
                let centerY = (Math.min(...selectedShape.points.map(p => p.y)) + Math.max(...selectedShape.points.map(p => p.y))) / 2;
                let currentAngle = Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
                let angleDifference = currentAngle - selectedShape.initialAngle;
                selectedShape.rotate(angleDifference);
                selectedShape.initialAngle = currentAngle;
                break;
        }
        draw();
    }
    else if (isDrawing && currentShape) {
        if (currentShape instanceof Line) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };  // Temporarily add the current mouse position as the second point of the line
            draw(); // Redraw the canvas without actually drawing the line
        }
        else if (currentShape instanceof Triangle) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            let thirdVertexX = currentShape.points[0].x - (currentShape.points[1].x - currentShape.points[0].x);
            let thirdVertexY = currentShape.points[1].y;
            currentShape.points[2] = { x: thirdVertexX, y: thirdVertexY };
            draw();
        }
        else if (currentShape instanceof Square) {
            currentShape.points[2] = { x: event.offsetX, y: event.offsetY };
            let x1 = Math.abs(event.offsetX - currentShape.points[0].x);
            let y1 = Math.abs(event.offsetY - currentShape.points[0].y);
            let side = Math.max(x1, y1);
            currentShape.points[1] = { x: currentShape.points[0].x + side, y: currentShape.points[0].y };
            currentShape.points[2] = { x: currentShape.points[1].x, y: currentShape.points[1].y + side };
            currentShape.points[3] = { x: currentShape.points[0].x, y: currentShape.points[0].y + side };
            draw();
        }
        else if (currentShape instanceof Rectangle) {
            currentShape.points[2] = { x: event.offsetX, y: event.offsetY };
            currentShape.points[1] = { x: event.offsetX, y: currentShape.points[0].y };
            currentShape.points[3] = { x: currentShape.points[0].x, y: event.offsetY };
            draw();
        }
        else if (currentShape instanceof Circle) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            let radius = Math.sqrt((currentShape.points[1].x - currentShape.points[0].x) ** 2 + (currentShape.points[1].y - currentShape.points[0].y) ** 2);
            currentShape.points[2] = { x: radius, y: 0 };
            draw();
        }
        else if (currentShape instanceof Ellipse) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            currentShape.points[2] = { x: currentShape.points[1].x - currentShape.points[0].x, y: currentShape.points[1].y - currentShape.points[0].y };
            draw();
        }
        else if (currentShape instanceof Polygon) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            currentShape.points[2] = { x: (currentShape.points[0].x + event.offsetX) / 2, y: (currentShape.points[0].y + event.offsetY) / 2 };
            currentShape.points[3] = { x: currentShape.points[1].x, y: currentShape.points[0].y };
            currentShape.points[4] = { x: currentShape.points[2].x + (currentShape.points[1].x - currentShape.points[0].x), y: currentShape.points[2].y };
            currentShape.points[5] = { x: currentShape.points[0].x, y: currentShape.points[1].y };
            currentShape.points[6] = { x: currentShape.points[2].x - (currentShape.points[1].x - currentShape.points[0].x), y: currentShape.points[2].y };
            draw();
        }
        else if (currentShape instanceof Polyline) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            currentShape.points[2] = { x: (currentShape.points[0].x + event.offsetX) / 2, y: (currentShape.points[0].y + event.offsetY) / 2 };
            currentShape.points[3] = { x: currentShape.points[1].x, y: currentShape.points[0].y };
            currentShape.points[4] = { x: currentShape.points[2].x + (currentShape.points[1].x - currentShape.points[0].x), y: currentShape.points[2].y };
            draw();
        }
        else if (currentShape instanceof Curve) {
            currentShape.points[1] = { x: event.offsetX, y: event.offsetY };
            currentShape.points[2] = { x: 50 + (currentShape.points[0].x + event.offsetX) / 2, y: 100 + (currentShape.points[0].y + event.offsetY) / 2 };
            currentShape.points[3] = { x: 100 + (currentShape.points[0].x + event.offsetX) / 2, y: 50 + (currentShape.points[0].y + event.offsetY) / 2 };
            draw();
        }
    }
});

canvas.addEventListener('mouseup', (event) => {
    transformMode = null;
    dragStartX = 0;
    dragStartY = 0;
    if (isDrawing) {
        isDrawing = false;
        shapes.push(currentShape);
        undoStack.push(shapes.slice()); undo
        //redoStack = [];
        //pushToUndoStack(shapes.slice()); // Deep copy for undo
        currentShape = null;
        draw(); //new
    }
});

document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault(); // Prevent the default behavior of the browser (like undoing text input)
        undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault(); // Prevent the default behavior of the browser (like redoing text input)
        redo();
    }
});


function undo() {
    if (undoStack.length > 0) {
        redoStack.push(undoStack.pop()); // Move the current state to the redo stack
        if (undoStack.length > 0) {
            shapes.splice(0, shapes.length, ...undoStack[undoStack.length - 1]); // Restore the previous state
        } else {
            shapes.splice(0, shapes.length); // Clear the shapes array
        }
        draw();
    }
}


// Implement the redo function
function redo() {
    if (redoStack.length > 0) {
        undoStack.push(redoStack.pop()); // Move the current state to the undo stack
        shapes.splice(0, shapes.length, ...undoStack[undoStack.length - 1]); // Restore the next state
        draw();
    }
}

function pushToUndoStack(state) {
    // Deep copy of shapes array
    const newState = JSON.parse(JSON.stringify(state));
    undoStack.push(newState);
    if (undoStack.length > MAX_UNDO_STACK_SIZE) {
        undoStack.shift(); // Remove oldest entry when full
    }
    redoStack = []; // Clear redo stack on new undo
}


// Listen for keydown events on the document
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'c') {
        copy(); // Call your copy function
    } else if (event.ctrlKey && event.key === 'v') {
        paste(); // Call your paste function
    }
});

function copy() {
    if (selectedShape) {
        const copy = Object.assign(Object.create(Object.getPrototypeOf(selectedShape)), selectedShape);
        shapes.push(copy);
        //draw();
    }
}

function paste() {
    isCopying = false;
    if (selectedShape) {
        let copiedShape = Object.assign(Object.create(Object.getPrototypeOf(selectedShape)), selectedShape); // Create a deep copy of the selected shape

        // Translate the copied shape 20 points to the right
        if (copiedShape instanceof Circle) {
            const dx = 200; // Translation distance
            const dy = 0; // No vertical translation for circles
            const center = copiedShape.points[0]; // Center of the circle
            const newCenter = { x: center.x + dx, y: center.y + dy }; // New center position
            const radius = copiedShape.points[2].x; // Radius of the circle
            const newPoint = { x: newCenter.x + radius, y: newCenter.y }; // Point on the circle after translation
            copiedShape.points = [newCenter, newPoint, { x: radius, y: 0 }]; // Update the circle points
        } else if (copiedShape instanceof Ellipse) {
            const dx = 200; // Translation distance
            const dy = 0; // No vertical translation for ellipses
            const center = copiedShape.points[0]; // Center of the ellipse
            const newCenter = { x: center.x + dx, y: center.y + dy }; // New center position
            const majorAxis = copiedShape.points[2].x; // Major axis length of the ellipse
            const minorAxis = copiedShape.points[2].y; // Minor axis length of the ellipse
            const newPoint = { x: newCenter.x + majorAxis, y: newCenter.y }; // Point on the ellipse after translation
            copiedShape.points = [newCenter, newPoint, { x: majorAxis, y: minorAxis }]; // Update the ellipse points
        } else {
            copiedShape.points = copiedShape.points.map(point => ({ x: point.x + 200, y: point.y })); // Translate other shapes
        }

        shapes.push(copiedShape); // Add the translated shape to the shapes array
        undoStack.push(shapes.slice()); // Add the current state to the undo stack for undo functionality
        redoStack = []; // Clear the redo stack
        draw(); // Redraw the canvas with the new shape
    }
}

function saveAsImage() {
    let canvas = document.getElementById("myCanvas");
    let link = document.createElement("a");

    link.download = "canvas_image.png";

    let dataURL = canvas.toDataURL("image/png");

    link.href = dataURL;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
}



// Save diagram to file—JSON format
function save() {
    const jsonData = JSON.stringify(shapes);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function load() {
    const input = document.getElementById('fileInput');
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const json = e.target.result;
        const loadedShapes = JSON.parse(json);
        shapes.splice(0, shapes.length);
        loadedShapes.forEach(shapeData => {
            let shape;
            if (shapeData.points.length >= 2) {
                if (shapeData.points.length === 2) {
                    shape = new Line();
                } else if (shapeData.points.length === 4) {
                    shape = new Rectangle();
                }
                if (shape) {
                    shape.color = shapeData.color;
                    shape.thickness = shapeData.thickness;
                    shape.points = shapeData.points;
                    shapes.push(shape);
                }
            }
        });
        undoStack.push(shapes.slice());
        redoStack = [];
        draw();
    }

    reader.readAsText(file);
}




function newPage() {
    if (shapes.length > 0) {
        const confirmClear = confirm('You have unsaved changes. Do you want to save before clearing the canvas?');
        if (confirmClear) {
            save();
        }
    }
    // Clear the canvas and reset the shapes array
    shapes.splice(0, shapes.length);
    undoStack.splice(0, undoStack.length);
    redoStack.splice(0, redoStack.length);
    draw(); // Redraw the cleared canvas
}

let zoomLevel = 1;
const zoomFactor = 1.1; // This factor controls how much the zoom changes per zoom step

function zoomIn() {
    zoomLevel *= zoomFactor;
    draw();
}

function zoomOut() {
    zoomLevel /= zoomFactor;
    draw();
}

class Shape {
    constructor() {
        this.points = [];
        this.color = 'black';
        this.thickness = 1;
        this.isSelected = false;
    }

    addPoint(x, y) {
        this.points.push({ x, y });
    }

    draw(ctx) {
        ctx.strokeStyle = this.isSelected ? 'black' : this.color;
        ctx.lineWidth = this.thickness;
    }
    move(dx, dy) {
        this.points = this.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    }

    scale(scaleX, scaleY) {
        let centerX = (Math.min(...this.points.map(p => p.x)) + Math.max(...this.points.map(p => p.x))) / 2;
        let centerY = (Math.min(...this.points.map(p => p.y)) + Math.max(...this.points.map(p => p.y))) / 2;

        this.points = this.points.map(p => ({
            x: centerX + (p.x - centerX) * scaleX,
            y: centerY + (p.y - centerY) * scaleY
        }));
    }
    rotate(angle) {
        let radians = angle * Math.PI / 180; // Convert angle to radians

        let centerX = (Math.min(...this.points.map(p => p.x)) + Math.max(...this.points.map(p => p.x))) / 2;
        let centerY = (Math.min(...this.points.map(p => p.y)) + Math.max(...this.points.map(p => p.y))) / 2;

        this.points = this.points.map(p => {
            let x = p.x - centerX;
            let y = p.y - centerY;
            return {
                x: x * Math.cos(radians) - y * Math.sin(radians) + centerX,
                y: x * Math.sin(radians) + y * Math.cos(radians) + centerY
            };
        });

    }
}

function setMode(mode) {
    switch (mode) {
        case 'draw':
            transformMode = null;
            break;
        case 'move':
            transformMode = 'move';
            break;
        case 'scale':
            transformMode = 'scale';
            break;
        case 'rotate':
            transformMode = 'rotate';
            break;
    }
}

class Line extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            //ctx.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
            ctx.stroke();
        }
    }
}

class Triangle extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            ctx.lineTo(this.points[2].x, this.points[2].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Square extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            ctx.lineTo(this.points[2].x, this.points[2].y);
            ctx.lineTo(this.points[3].x, this.points[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}
class Rectangle extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 4) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            ctx.lineTo(this.points[2].x, this.points[2].y);
            ctx.lineTo(this.points[3].x, this.points[3].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Circle extends Shape {
    constructor() {
        super();
        this.radius = 0;
    }
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 2) {
            this.radius = Math.sqrt(
                (this.points[1].x - this.points[0].x) ** 2 +
                (this.points[1].y - this.points[0].y) ** 2
            );
            ctx.beginPath();
            ctx.arc(this.points[0].x, this.points[0].y, this.radius, 0, 2 * Math.PI);
            ctx.stroke();
        }

    }
    scale(scaleX, scaleY) {
        // Using uniform scaling for the circle to maintain its shape
        let uniformScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
        this.radius *= uniformScale;
        // Recalculate the position of point[1] which defines the radius end-point
        let angle = Math.atan2(this.points[1].y - this.points[0].y, this.points[1].x - this.points[0].x);
        this.points[1].x = this.points[0].x + Math.cos(angle) * this.radius;
        this.points[1].y = this.points[0].y + Math.sin(angle) * this.radius;

    }

}

class Ellipse extends Shape {
    constructor() {
        super();
        this.radiusX = 0;
        this.radiusY = 0;
        this.angle = 0;
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 2) {
            this.radiusX = Math.abs(this.points[1].x - this.points[0].x);
            this.radiusY = Math.abs(this.points[1].y - this.points[0].y);

            ctx.save();
            ctx.translate(this.points[0].x, this.points[0].y);
            ctx.rotate(this.angle);
            ctx.scale(1, this.radiusY / this.radiusX);
            ctx.beginPath();
            ctx.arc(0, 0, this.radiusX, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
        }
    }

    rotate(angle) {
        this.angle += angle;
    }
}
class Polygon extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 7) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[3].x, this.points[3].y);
            ctx.lineTo(this.points[4].x, this.points[4].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            ctx.lineTo(this.points[5].x, this.points[5].y);
            ctx.lineTo(this.points[6].x, this.points[6].y);
            ctx.closePath();
            ctx.stroke();
        }
    }
}
class Polyline extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            ctx.lineTo(this.points[3].x, this.points[3].y);
            ctx.lineTo(this.points[4].x, this.points[4].y);
            ctx.lineTo(this.points[1].x, this.points[1].y);
            ctx.stroke();
        }
    }
}
class Curve extends Shape {
    draw(ctx) {
        super.draw(ctx);
        if (this.points.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y); // Starting point
            //ctx.quadraticCurveTo(this.points[2].x, this.points[2].y, this.points[1].x, this.points[1].y); // Control point and ending point
            ctx.bezierCurveTo(this.points[2].x, this.points[2].y, this.points[3].x, this.points[3].y, this.points[1].x, this.points[1].y); // Control points and ending point
            ctx.stroke();
        }
    }
}
// Implement other shape classes (Square, Rectangle, Circle, Ellipse, Curve, Polyline, Polygon) similarly...

// Initial grid drawing
drawGrid();
