let Pose = ( sketch ) => {
  let socket;
  let body_pos = {};
  let display = false;

  let xoffset = 50;  // millimeters
  let yoffset = 50;

  let screenwidth = 392.85; //millimeters
  let screenheight = 698.4;

  let junctions = [[1, 2], [1, 5], [2, 3], [3, 4], [5, 6], [6, 7], [1, 8], [8, 9],
                  [9, 10], [1, 11], [11, 12], [12, 13], [1, 0], [0, 14], [14, 16],
                  [0, 15], [15, 17]];

  let keypoints = ['nose', 'neck', 'r_sho', 'r_elb', 'r_wri', 'l_sho', 'l_elb',
                  'l_wri', 'r_hip', 'r_knee', 'r_ank', 'l_hip', 'l_knee', 'l_ank',
                  'r_eye', 'l_eye', 'r_ear', 'l_ear'];


  sketch.movable = false;
  sketch.latched = false;
  sketch.activated = true;
  sketch.clickable = false;

  sketch.set = (p1, p2, w, h) => {
    sketch.width = w;
    sketch.height = h;
    sketch.x = p1;
    sketch.y = p2;
    sketch.selfCanvas = sketch.createCanvas(sketch.width, sketch.height).position(sketch.x, sketch.y);

    socket = io.connect('http://0.0.0.0:5000');
    socket.on('update',
      function(data) {
        body_pos = data;
        console.log(data);
      }
    );
  };


  sketch.show = () => {
    sketch.selfCanvas.clear()
    socket.emit('nextreflection', true);
    for(var part in body_pos) {
      if(body_pos[part] != -1){
        sketch.fill(200);
        let x = width/2 - width*(body_pos[part][0] - xoffset)/screenwidth;
        let y = height*(body_pos[part][1] - yoffset)/screenheight;
        sketch.ellipse(x ,y , 30);
        sketch.text(part, x + 20, y + 20);
      }
    }
    sketch.drawLine();
  }

  sketch.drawLine = () => {
    sketch.stroke(255);
    sketch.strokeWeight(4);
    junctions.forEach(pair => {
      try{
      if(body_pos[keypoints[pair[0]]] != -1 && body_pos[keypoints[pair[1]]] != -1){
        let x1 = width/2 - width*(body_pos[keypoints[pair[0]]][0] - xoffset)/screenwidth;
        let y1 = height*(body_pos[keypoints[pair[0]]][1] - yoffset)/screenheight;
        let x2 = width/2 - width*(body_pos[keypoints[pair[1]]][0] - xoffset)/screenwidth;
        let y2 = height*(body_pos[keypoints[pair[1]]][1] - yoffset)/screenheight;
        sketch.line(x1, y1, x2, y2);
      }
    }
    catch(e){

    }
    });
  }
}
