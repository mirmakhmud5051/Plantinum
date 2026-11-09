import { chromium } from "playwright";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";

// Render the actual editable models without the streamed world, so foliage
// silhouettes, veins, bloom colors and WebGL materials can be reviewed together.
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (process.platform === "win32" && existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : undefined),
  headless: true, args: ["--no-sandbox"],
});
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("**/plant-reference", (route) => route.fulfill({
    contentType: "text/html",
    body: `<html><head><meta charset="UTF-8"><link rel="icon" href="data:,"><style>
      body{margin:0;padding:24px;background:#e9e8d8;color:#304c29;font:16px Arial}
      h1{font-size:22px;margin:0 0 18px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
      figure{margin:0;background:#f8f7ed;border-radius:18px;overflow:hidden;text-align:center}
      canvas{width:100%;height:390px;display:block}figcaption{padding:10px;font-size:17px}
    </style></head><body><h1>PLANTINUM · secnd.jpg o‘simliklar palitrasi</h1><main></main>
    <script type="module">
      import * as THREE from '/node_modules/three/build/three.module.js';
      import { entityVoxels, voxelMesh } from '/src/voxels.js';
      import { byId } from '/src/catalog.js';
      const types=['smaragd','boxwood','cube-bush','ornamental','fern','monstera','hosta','grass','rose','wildflowers','hydrangea','sunflower'];
      const results=[];
      for(const type of types){
        const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
        renderer.setSize(330,390);renderer.setPixelRatio(1);
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
        renderer.setClearColor('#f8f7ed');
        const scene=new THREE.Scene(),model=voxelMesh(entityVoxels({type,seed:17,shape:'natural',removed:[],growth:1}));
        scene.add(model,new THREE.HemisphereLight(0xf5fcff,0x7b9560,2));
        const sun=new THREE.DirectionalLight(0xffe9c5,2.8);sun.position.set(-3,6,4);scene.add(sun);
        const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
        const span=Math.max(size.y*1.2,size.x*1.3,size.z*1.2,1);
        const camera=new THREE.OrthographicCamera(-span*.5,span*.5,span*.59,-span*.59,.1,100);
        camera.position.copy(center).add(new THREE.Vector3(3,2.2,5));camera.lookAt(center);
        renderer.render(scene,camera);
        const figure=document.createElement('figure'),caption=document.createElement('figcaption');
        caption.textContent=byId(type).name;figure.append(renderer.domElement,caption);document.querySelector('main').append(figure);
        const blooms=model.children.filter(child=>child.userData.voxels[0].geometry==='petal');
        results.push({type,error:renderer.getContext().getError(),petalsClean:blooms.every(child=>!child.material.map),size:size.toArray()});
      }
      window.referenceResults=results;
    </script></body></html>`,
  }));
  await page.goto(`${process.env.TEST_URL || "http://127.0.0.1:5199"}/plant-reference`);
  await page.waitForFunction(() => window.referenceResults?.length === 12, null, { timeout: 60000 });
  const results = await page.evaluate(() => window.referenceResults);
  for (const result of results) {
    assert.equal(result.error, 0, `${result.type} renders without a WebGL error`);
    assert.ok(result.petalsClean, `${result.type} petals keep their flower color`);
    assert.ok(result.size.every((value) => Number.isFinite(value) && value > 0));
  }
  assert.deepEqual(errors, []);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/reference-plants.png", fullPage: true });
  console.log("PASS: reference foliage, split leaves, veined rosettes, clean flower materials and twelve botanical silhouettes render without WebGL errors.");
} finally {
  await browser.close();
}
