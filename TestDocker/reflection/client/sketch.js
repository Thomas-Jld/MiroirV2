let socket;
let body_pos = {};
let display = false;

function setup() {
  fullscreen(true);
  createCanvas(windowWidth, windowHeight);
  socket = io.connect('http://0.0.0.0:5000');


  socket.on('update',
    function(data) {
      body_pos = data;
      console.log(data);
    }
  );
  frameRate(30);
}

function draw() {
  background(0);
  socket.emit('next', true);
  for(var part in body_pos) {
    if(body_pos[part] != -1){
      fill(255);
      let x = width/2 - body_pos[part][0];
      let y = height/2 + body_pos[part][1];
      ellipse(x ,y , 10);
      text(part, x + 20, y + 20);
    }
  }
}
