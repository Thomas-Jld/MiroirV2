let Hands = ( sketch ) => {
  let hands_joints = [];
  let display = false;

  let xoffset = 50;  // millimeters
  let yoffset = 50;

  let screenwidth = 392.85; //millimeters
  let screenheight = 698.4;

  let junctions = [[ 0,  1, 0], [ 0,  5, 0], [ 0,  9, 0], [ 0, 13, 0], [ 0, 17, 0], [ 1,  2, 1], 
                   [ 2,  3, 1], [ 3,  4, 1], [ 5,  9, 0], [ 5,  6, 2], [ 6,  7, 2], [ 7,  8, 2], 
                   [ 9, 10, 3], [ 9, 13, 0], [10, 11, 4], [11, 12, 4], [13, 14, 5], [13, 17, 0],
                   [14, 15, 5], [15, 16, 5], [17, 18, 6], [18, 19, 6], [19, 20, 6]];

  let keypoints = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];


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

    sketch.colorMode(HSB);
    socket.on('updateHands',
      function(data) {
        hands_joints = data;
      }
    );
  };


  sketch.show = () => {
    sketch.selfCanvas.clear();
    socket.emit('nextHands', true);
    let ratio = hands_joints[hands_joints.length - 1];
    for(let i = 0; i < hands_joints.length - 1; i++){
      for(var index in keypoints) {
        sketch.fill(0, 255, 0);
        let ratio = hands_joints[hands_joints.length - 1];
        let x = width*(hands_joints[i][index][0]*ratio[0] - xoffset)/screenwidth;
        let y = height*(hands_joints[i][index][1]*ratio[1] - yoffset)/screenheight;
        sketch.ellipse(x ,y , 5);
        sketch.text(index, x + 20, y + 20);
      }
    }
    sketch.drawLine();
  }

  sketch.drawLine = () => {
    sketch.stroke(0, 255, 0);
    sketch.strokeWeight(4);
    let ratio = hands_joints[hands_joints.length - 1];
    junctions.forEach(pair => {
      sketch.stroke(pair[2]*360/7, 255, 255)
      for(let i = 0; i < hands_joints.length - 1; i++){
        let x1 = width*(hands_joints[i][pair[0]][0]*ratio[0] - xoffset)/screenwidth;
        let y1 = height*(hands_joints[i][pair[0]][1]*ratio[1] - yoffset)/screenheight;
        let x2 = width*(hands_joints[i][pair[1]][0]*ratio[0] - xoffset)/screenwidth;
        let y2 = height*(hands_joints[i][pair[1]][1]*ratio[1] - yoffset)/screenheight;
        sketch.line(x1, y1, x2, y2);
      }
    });
  }
}
  