class Star {
    constructor(x, y, energy, starColor) {
        this.position = [x,0.25,y];
        this.energy = energy;
        this.starMat = new THREE.MeshBasicMaterial( { color: starColor } );
        this.geometry = new THREE.BufferGeometry();
    }
}