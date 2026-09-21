/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0;
const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0;
const WIN_TOP = 1;  // default top and bottom y coords in world space

const INPUT_TRIANGLES_URL =
    "https://raw.githubusercontent.com/NCSUCGClassPrivate/exercise5/async/triangles.json";

const INPUT_ELLIPSOIDS_URL =
    "https://raw.githubusercontent.com/NCSUCGClassPrivate/exercise5/async/ellipsoids.json";

var Eye = new vec4.fromValues(0.5, 0.5, -0.5, 1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader


// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
// uses async get with older callback API
// should one day use newer promise API
function getJSONFile(url, descr) {

    var returnValue = String.null; // the default return value

    if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
        console.error("getJSONFile: parameter not a string");
    else {

        var loadDone = false; // whether the load attempt is done

        // when get fails
        function getFailed(evt) {
            loadDone = true;
            console.error(descr + " failed to load.");
        }

        // when get aborted
        function getAborted(evt) {
            loadDone = true;
            console.error(descr + " was aborted by user.");
        }

        // when get times out
        function getTimedOut(evt) {
            loadDone = true;
            console.error(descr + " took too long to load.");
        }

        // when get loads
        function getLoaded(evt) {
            loadDone = true;
            console.log(descr + " loaded.");
            returnValue = JSON.parse(httpReq.responseText);
        }

        // set up http request object
        var httpReq = new XMLHttpRequest();

        // httpReq.timeout = 2000;
        httpReq.addEventListener("error", getFailed);
        httpReq.addEventListener("abort", getAborted);
        httpReq.addEventListener("timeout", getTimedOut);
        httpReq.addEventListener("load", getLoaded);

        // issue async get request
        httpReq.open("GET", url, false);
        httpReq.send(null);

        // wait for http request to complete
        var numChecks = 0;

        while (!loadDone && (numChecks < 25)) {
            console.log("loadDone: " + loadDone + ", numChecks: " + numChecks);
            window.setTimeout(function(){}, 100);
            numChecks++;
        }
    }

    return(returnValue);
}


// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");

    try {

        if (gl == null) {
            throw "unable to create gl context -- is your browser gl ready?";
        } else {

            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);

            gl.enable(gl.DEPTH_TEST);
        }

    }

    catch(e) {
        console.log(e);
    }
}


// read triangles in, load them into webgl buffers
function loadTriangles() {

    var inputTriangles = getJSONFile(
        INPUT_TRIANGLES_URL,
        "triangles"
    );

    if (inputTriangles != String.null) {

        var whichSetVert;
        var whichSetTri;

        var coordArray = [];
        var indexArray = [];

        var vtxBufferSize = 0;

        var vtxToAdd = [];
        var indexOffset = vec3.create();
        var triToAdd = vec3.create();

        for (
            var whichSet = 0;
            whichSet < inputTriangles.length;
            whichSet++
        ) {

            vec3.set(
                indexOffset,
                vtxBufferSize,
                vtxBufferSize,
                vtxBufferSize
            );

            // set up the vertex coord array
            for (
                whichSetVert = 0;
                whichSetVert < inputTriangles[whichSet].vertices.length;
                whichSetVert++
            ) {

                vtxToAdd =
                    inputTriangles[whichSet].vertices[whichSetVert];

                coordArray.push(
                    vtxToAdd[0],
                    vtxToAdd[1],
                    vtxToAdd[2]
                );
            }

            // set up the triangle index array
            for (
                whichSetTri = 0;
                whichSetTri < inputTriangles[whichSet].triangles.length;
                whichSetTri++
            ) {

                vec3.add(
                    triToAdd,
                    indexOffset,
                    inputTriangles[whichSet].triangles[whichSetTri]
                );

                indexArray.push(
                    triToAdd[0],
                    triToAdd[1],
                    triToAdd[2]
                );
            }

            vtxBufferSize +=
                inputTriangles[whichSet].vertices.length;

            triBufferSize +=
                inputTriangles[whichSet].triangles.length;
        }

        triBufferSize *= 3;

        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer();

        gl.bindBuffer(
            gl.ARRAY_BUFFER,
            vertexBuffer
        );

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(coordArray),
            gl.STATIC_DRAW
        );

        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer();

        gl.bindBuffer(
            gl.ELEMENT_ARRAY_BUFFER,
            triangleBuffer
        );

        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indexArray),
            gl.STATIC_DRAW
        );
    }
}


// setup the webGL shaders
function setupShaders() {

    // fragment shader
    var fShaderCode = `
        void main(void) {

            // CHANGED FROM WHITE TO RED
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);

        }
    `;

    // vertex shader
    var vShaderCode = `
        attribute vec3 vertexPosition;

        void main(void) {

            gl_Position = vec4(vertexPosition, 1.0);

        }
    `;

    try {

        var fShader =
            gl.createShader(gl.FRAGMENT_SHADER);

        gl.shaderSource(
            fShader,
            fShaderCode
        );

        gl.compileShader(fShader);


        var vShader =
            gl.createShader(gl.VERTEX_SHADER);

        gl.shaderSource(
            vShader,
            vShaderCode
        );

        gl.compileShader(vShader);


        if (
            !gl.getShaderParameter(
                fShader,
                gl.COMPILE_STATUS
            )
        ) {

            throw "error during fragment shader compile: "
                + gl.getShaderInfoLog(fShader);

        } else if (
            !gl.getShaderParameter(
                vShader,
                gl.COMPILE_STATUS
            )
        ) {

            throw "error during vertex shader compile: "
                + gl.getShaderInfoLog(vShader);

        } else {

            var shaderProgram =
                gl.createProgram();

            gl.attachShader(
                shaderProgram,
                fShader
            );

            gl.attachShader(
                shaderProgram,
                vShader
            );

            gl.linkProgram(shaderProgram);

            if (
                !gl.getProgramParameter(
                    shaderProgram,
                    gl.LINK_STATUS
                )
            ) {

                throw "error during shader program linking: "
                    + gl.getProgramInfoLog(shaderProgram);

            } else {

                gl.useProgram(shaderProgram);

                vertexPositionAttrib =
                    gl.getAttribLocation(
                        shaderProgram,
                        "vertexPosition"
                    );

                gl.enableVertexAttribArray(
                    vertexPositionAttrib
                );
            }
        }

    }

    catch(e) {
        console.log(e);
    }
}


// render the loaded model
function renderTriangles() {

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    // vertex buffer
    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        vertexBuffer
    );

    gl.vertexAttribPointer(
        vertexPositionAttrib,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );

    // triangle buffer
    gl.bindBuffer(
        gl.ELEMENT_ARRAY_BUFFER,
        triangleBuffer
    );

    gl.drawElements(
        gl.TRIANGLES,
        triBufferSize,
        gl.UNSIGNED_SHORT,
        0
    );
}


/* MAIN -- HERE is where execution begins after window load */

function main() {

    setupWebGL();

    loadTriangles();

    setupShaders();

    renderTriangles();
}
