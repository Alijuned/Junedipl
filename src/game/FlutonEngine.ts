import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ActivePowerUpHUD,
  CharacterSkinId,
  CollectiblePowerUpType,
  GamePhase,
  GraphicsQuality,
  HoverboardSkinId,
  HudSnapshot,
  IntroCaptionState,
  LaneIndex,
  PowerUpPickupBanner,
  PowerUpType,
} from '../types/game';
import { audioEngine } from './audio';
import {
  createFlutonCat,
  createFlutonTokenMesh,
  createFuturisticTrain,
  createHoverboard,
  createObstacleMesh,
  createPalmTree,
  createPowerUpMesh,
  createSecurityDog,
  createSecurityOfficer,
  DogRig,
  FlutonCatRig,
  HoverboardRig,
  OfficerRig,
  SharedAssetRegistry,
  TRAIN_PALETTES,
} from './models';
import { CHARACTER_SKINS, HOVERBOARD_SKINS } from './storage';
import {
  createBillboardTexture,
  createBuildingFacadeTexture,
  createPlatformTexture,
  createRadialShadowTexture,
  createTrackBedTexture,
} from './textures';

const LANE_X = [-3.2, 0, 3.2] as const;
const CHUNK_LEN = 32;
const NUM_CHUNKS = 7;
const TRAIN_LEN = 16.5;
const TRAIN_HEIGHT = 3.32;
const MAX_PARTICLES = 72;
const COLLISION_DURATION = 0.62;

// Pre-allocated scratch math helpers (zero per-frame allocations)
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _scaleVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

interface TrackChunk {
  group: THREE.Group;
  zStart: number;
  hasGFlutonBanner: boolean;
  bannerZOffset: number;
  bannerAnnounced: boolean;
}

type ObstacleKind =
  | 'train_static'
  | 'train_moving'
  | 'barrier'
  | 'overhead'
  | 'roadblock'
  | 'construction';

type StaticBarrierKind = 'barrier' | 'overhead' | 'roadblock' | 'construction';

interface PooledTrainSlot {
  paletteIndex: number;
  withRamp: boolean;
  inUse: boolean;
  mesh: THREE.Group;
}

interface PooledBarrierSlot {
  kind: StaticBarrierKind;
  inUse: boolean;
  mesh: THREE.Group;
}

interface PooledTokenSlot {
  inUse: boolean;
  mesh: THREE.Group;
}

interface PooledPowerUpSlot {
  type: PowerUpType;
  inUse: boolean;
  mesh: THREE.Group;
}

interface ActiveObstacle {
  id: number;
  kind: ObstacleKind;
  lane: LaneIndex;
  z: number;
  length: number;
  width: number;
  height: number;
  clearanceY: number;
  withRamp: boolean;
  speed: number;
  honked: boolean;
  mesh: THREE.Group;
  trainPoolSlot?: PooledTrainSlot;
  barrierPoolSlot?: PooledBarrierSlot;
}

interface ActiveToken {
  lane: LaneIndex;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  magnetized: boolean;
  slot: PooledTokenSlot;
  mesh: THREE.Group;
}

interface ActivePowerUp {
  type: CollectiblePowerUpType;
  lane: LaneIndex;
  y: number;
  z: number;
  collected: boolean;
  collectAnim: number;
  slot: PooledPowerUpSlot;
  mesh: THREE.Group;
}

interface ParticleState {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  colorHex: number;
}

export class FlutonEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private skyTex!: THREE.CanvasTexture;
  private shadowTex!: THREE.CanvasTexture;
  private extraGeos: THREE.BufferGeometry[] = [];
  private extraMats: THREE.Material[] = [];
  private extraTexs: THREE.Texture[] = [];

  private isSoftwareGl: boolean;
  private maxAnisotropy: number;
  private quality: GraphicsQuality;
  private maxParticlesAllowed = MAX_PARTICLES;

  private assets!: SharedAssetRegistry;
  private sunLight!: THREE.DirectionalLight;
  private fog!: THREE.FogExp2;
  private clouds: THREE.Group[] = [];

  private playerRig!: FlutonCatRig;
  private hoverboardRig!: HoverboardRig;
  private officerRig!: OfficerRig;
  private dogRig!: DogRig;
  private playerShadow!: THREE.Mesh;

  private introTrain!: {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    paletteIndex: number;
  };
  private introSprayDone = false;

  // World Chunks & Active Entities
  private chunks: TrackChunk[] = [];
  private obstacles: ActiveObstacle[] = [];
  private tokens: ActiveToken[] = [];
  private powerUps: ActivePowerUp[] = [];
  private nextObstacleId = 1;

  // Object Pools (zero runtime allocations!)
  private trainPool: PooledTrainSlot[] = [];
  private barrierPool: PooledBarrierSlot[] = [];
  private tokenPool: PooledTokenSlot[] = [];
  private powerUpPool: PooledPowerUpSlot[] = [];
  private particleInstanced!: THREE.InstancedMesh;
  private particleStates: ParticleState[] = [];
  private particleWriteCursor = 0;

  // Game Loop State
  private rafId = 0;
  private timeoutId = 0;
  private lastTime = performance.now();
  private disposed = false;
  private phase: GamePhase = 'menu';
  private elapsed = 0;
  private lastCameraFov = 60;

  // Strict Collision & Game Over Guards
  private collisionLocked = false;
  private gameOverTriggered = false;
  private collisionTimer = 0;
  private shakeIntensity = 0;

  // Runner Kinematics
  private targetLane: LaneIndex = 0;
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private velY = 0;
  private isGrounded = true;
  private slideTimer = 0;
  private rollSpin = 0;
  private landingSquash = 0;
  private runCycle = 0;
  private lastFootstepPhase = 0;

  private baseSpeed = 16.5;
  private currentSpeed = 16.5;
  private distance = 0;
  private score = 0;
  private bestScore = 0;
  private runTokens = 0;
  private totalTokens = 0;
  private powerupsUsedCount = 0;
  private nextSpawnZ = -42;

  // Chase State
  private chaseDist = 5.4;
  private stumbleTimer = 0;
  private chaseSoundTimer = 3.5;

  // Fluton Ecosystem Power-Ups
  private fheTimer = 0; // FHE: Protective energy shield
  private zeroMevTimer = 0; // ZERO MEV: Lightning speed boost
  private stealthTimer = 0; // ENCRYPTED INTENTS: Stealth mode + obstacle phase
  private settlementTimer = 0; // CONFIDENTIAL SETTLEMENT: Coin magnet
  private isStealthVisualActive = false;
  private hoverboardTimer = 0;
  private hasShield = false;
  private hoverboardCharge = 100;
  private invulnTimer = 0;
  private lastPowerUpSpawnZ = -20;
  private lastPowerUpType: CollectiblePowerUpType | null = null;
  private nextPickupBannerId = 1;

  // Intro State
  private introTime = 0;
  private introWhistled = false;
  private introBarked = false;
  private introSprayed = false;

  // Banner feedback
  private bannerMessage: string | null = null;
  private bannerTimer = 0;
  private pickupBanner: PowerUpPickupBanner | null = null;
  private pickupBannerTimer = 0;

  // Current Skins
  private charSkinId: CharacterSkinId = 'classic';
  private boardSkinId: HoverboardSkinId = 'mk1';

  // Touch Swipe Tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private touchStartTime = 0;
  private lastTapTime = 0;

  // Callbacks
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private onRunFinished: (stats: {
    runScore: number;
    runTokens: number;
    runDistance: number;
    powerupsUsed: number;
  }) => void;
  private lastHudEmit = 0;

  constructor(
    container: HTMLElement,
    initialBestScore: number,
    initialTotalTokens: number,
    initialChar: CharacterSkinId,
    initialBoard: HoverboardSkinId,
    initialQuality: GraphicsQuality,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onRunFinished: (stats: {
      runScore: number;
      runTokens: number;
      runDistance: number;
      powerupsUsed: number;
    }) => void
  ) {
    this.container = container;
    this.bestScore = initialBestScore;
    this.totalTokens = initialTotalTokens;
    this.charSkinId = initialChar;
    this.boardSkinId = initialBoard;
    this.quality = initialQuality;
    this.onHudUpdate = onHudUpdate;
    this.onRunFinished = onRunFinished;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x7c6fb8, 0.0085);
    this.scene.fog = this.fog;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmremGenerator.dispose();

    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 220);

    this.assets = new SharedAssetRegistry(this.maxAnisotropy, this.quality);

    this.setupSkyAndLights();
    this.setupWorldChunks();
    this.setupActors();
    this.setupPools();
    this.setupEvents();

    this.setGraphicsQuality(this.quality);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.emitHud(true);
    this.startLoop();
  }

  public setGraphicsQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    const isLow = quality === 'low';
    const isMedium = quality === 'medium';

    const dprCap = isLow ? 1 : isMedium ? 1.5 : 2;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, dprCap)
    );

    const shadowsOn = !isLow && !this.isSoftwareGl;
    this.renderer.shadowMap.enabled = shadowsOn;
    if (this.sunLight) {
      this.sunLight.castShadow = shadowsOn;
      const mapDim = isMedium ? 512 : 1024;
      if (this.sunLight.shadow.mapSize.width !== mapDim) {
        this.sunLight.shadow.mapSize.set(mapDim, mapDim);
        if (this.sunLight.shadow.map) {
          this.sunLight.shadow.map.dispose();
          this.sunLight.shadow.map = null;
        }
      }
    }

    this.camera.far = isLow ? 165 : isMedium ? 205 : 250;
    this.camera.updateProjectionMatrix();
    this.lastCameraFov = this.camera.fov;

    this.fog.density = isLow ? 0.0112 : isMedium ? 0.009 : 0.0078;
    this.maxParticlesAllowed = isLow ? 24 : isMedium ? 48 : MAX_PARTICLES;

    const cloudCap = isLow ? 6 : isMedium ? 10 : this.clouds.length;
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].visible = i < cloudCap;
    }

    const aniso = isLow ? 1 : isMedium ? Math.min(4, this.maxAnisotropy) : this.maxAnisotropy;
    this.assets.setAnisotropy(aniso);
    for (const t of this.extraTexs) {
      t.anisotropy = aniso;
      t.needsUpdate = true;
    }

    this.renderer.setSize(
      this.container.clientWidth || window.innerWidth,
      this.container.clientHeight || window.innerHeight
    );
  }

  private setupSkyAndLights(): void {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 32;
    skyCanvas.height = 512;
    const sctx = skyCanvas.getContext('2d')!;
    const grad = sctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.35, '#4f46e5');
    grad.addColorStop(0.62, '#a855f7');
    grad.addColorStop(0.8, '#f472b6');
    grad.addColorStop(1, '#fdba74');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 32, 512);
    this.skyTex = new THREE.CanvasTexture(skyCanvas);
    this.skyTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.skyTex;

    const hemi = new THREE.HemisphereLight(0xc4b5fd, 0x3b0764, 1.08);
    this.scene.add(hemi);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = !this.isSoftwareGl && this.quality !== 'low';
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 90;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 0.78);
    rimLight.position.set(-14, 10, -24);
    this.scene.add(rimLight);

    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfef2ff,
      roughness: 0.9,
      emissive: 0xfbcfe8,
      emissiveIntensity: 0.18,
    });
    this.extraMats.push(cloudMat);

    const puffGeoSm = new THREE.SphereGeometry(2.2, 8, 8);
    const puffGeoLg = new THREE.SphereGeometry(3.3, 8, 8);
    this.extraGeos.push(puffGeoSm, puffGeoLg);

    for (let i = 0; i < 14; i++) {
      const cGroup = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(p === 1 ? puffGeoLg : puffGeoSm, cloudMat);
        puff.scale.set(1.5, 0.75, 1);
        puff.position.set((p - 1) * 2.4, p === 1 ? 0.6 : 0, 0);
        cGroup.add(puff);
      }
      cGroup.position.set(
        (i % 2 === 0 ? -1 : 1) * (18 + ((i * 7) % 34)),
        22 + (i % 4) * 5,
        -i * 18
      );
      this.clouds.push(cGroup);
      this.scene.add(cGroup);
    }
  }

  private setupWorldChunks(): void {
    const texSize = this.quality === 'low' ? 256 : 512;
    const trackTex = createTrackBedTexture(this.maxAnisotropy, texSize);
    const platTex = createPlatformTexture(this.maxAnisotropy, texSize);
    const billboardTex1 = createBillboardTexture(
      this.maxAnisotropy,
      'gFluton',
      'METRO EXPRESS LINE',
      '#c084fc'
    );
    const billboardTex2 = createBillboardTexture(
      this.maxAnisotropy,
      'FLUTON RUN',
      'SYDNEYSUNDOWN',
      '#38bdf8'
    );
    this.extraTexs.push(trackTex, platTex, billboardTex1, billboardTex2);

    const trackMat = new THREE.MeshStandardMaterial({
      map: trackTex,
      roughness: 0.85,
      metalness: 0.12,
    });
    const platMat = new THREE.MeshStandardMaterial({
      map: platTex,
      roughness: 0.55,
      metalness: 0.15,
    });
    const steelRailMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.9,
      roughness: 0.22,
    });
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.5 });
    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      roughness: 0.4,
      metalness: 0.65,
    });
    const archMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b3a,
      roughness: 0.45,
      metalness: 0.45,
    });
    const neonPurpleMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
    const signalGreenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const signMat1 = new THREE.MeshBasicMaterial({ map: billboardTex1 });
    const signMat2 = new THREE.MeshBasicMaterial({ map: billboardTex2 });
    this.extraMats.push(
      trackMat,
      platMat,
      steelRailMat,
      curbMat,
      bridgeMat,
      archMat,
      neonPurpleMat,
      signalGreenMat,
      poleMat,
      signMat1,
      signMat2
    );

    const bldgMats: THREE.MeshStandardMaterial[] = [];
    for (let idx = 0; idx < 4; idx++) {
      const bTex = createBuildingFacadeTexture(this.maxAnisotropy, idx);
      this.extraTexs.push(bTex);
      const bm = new THREE.MeshStandardMaterial({
        map: bTex,
        roughness: 0.45,
        metalness: 0.25,
      });
      bldgMats.push(bm);
      this.extraMats.push(bm);
    }

    // Shared Chunk Geometries (slashing geometry count by >80%)
    const floorGeo = new THREE.PlaneGeometry(11.4, CHUNK_LEN);
    const railGeo = new THREE.BoxGeometry(0.11, 0.08, CHUNK_LEN);
    const platGeo = new THREE.BoxGeometry(5.8, 0.9, CHUNK_LEN);
    const curbGeo = new THREE.BoxGeometry(0.22, 0.25, CHUNK_LEN);
    const neonEdgeGeo = new THREE.BoxGeometry(0.08, 0.08, CHUNK_LEN);
    const pillarGeo = new THREE.CylinderGeometry(0.14, 0.18, 4.2, 8);
    const roofGeo = new THREE.BoxGeometry(4.2, 0.22, 16);
    const roofStripGeo = new THREE.BoxGeometry(0.14, 0.1, 15.6);
    const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.11, 5.2, 7);
    const lampHeadGeo = new THREE.BoxGeometry(0.7, 0.16, 0.35);
    const tunnelWallGeo = new THREE.BoxGeometry(1.2, 6.2, CHUNK_LEN);
    const tunnelRoofGeo = new THREE.BoxGeometry(13.4, 1.1, CHUNK_LEN);
    const tunnelRibGeo = new THREE.BoxGeometry(11.4, 0.16, 0.25);
    const bridgeSpanGeo = new THREE.BoxGeometry(13.2, 0.65, 1.1);
    const signGeo = new THREE.PlaneGeometry(5.6, 2.05);
    const sigGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const bldgGeoBase = new THREE.BoxGeometry(7.5, 1, 12);

    this.extraGeos.push(
      floorGeo,
      railGeo,
      platGeo,
      curbGeo,
      neonEdgeGeo,
      pillarGeo,
      roofGeo,
      roofStripGeo,
      lampPoleGeo,
      lampHeadGeo,
      tunnelWallGeo,
      tunnelRoofGeo,
      tunnelRibGeo,
      bridgeSpanGeo,
      signGeo,
      sigGeo,
      bldgGeoBase
    );

    for (let i = 0; i < NUM_CHUNKS; i++) {
      const group = new THREE.Group();
      const zStart = 20 - i * CHUNK_LEN;

      const trackFloor = new THREE.Mesh(floorGeo, trackMat);
      trackFloor.rotation.x = -Math.PI / 2;
      trackFloor.receiveShadow = true;
      group.add(trackFloor);

      // Raised 3D metallic steel rails for all 3 lanes!
      for (const lx of LANE_X) {
        for (const offset of [-0.72, 0.72]) {
          const rail = new THREE.Mesh(railGeo, steelRailMat);
          rail.position.set(lx + offset, 0.04, 0);
          group.add(rail);
        }
      }

      for (const side of [-1, 1]) {
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(side * 8.6, 0.45, 0);
        plat.receiveShadow = true;
        group.add(plat);

        const trim = new THREE.Mesh(curbGeo, curbMat);
        trim.position.set(side * 5.75, 0.85, 0);
        group.add(trim);

        const curbNeon = new THREE.Mesh(neonEdgeGeo, neonPurpleMat);
        curbNeon.position.set(side * 5.66, 0.96, 0);
        group.add(curbNeon);

        if (i % 2 === 0) {
          const pillar = new THREE.Mesh(pillarGeo, poleMat);
          pillar.position.set(side * 7.8, 2.9, 0);
          group.add(pillar);

          const roof = new THREE.Mesh(roofGeo, bridgeMat);
          roof.position.set(side * 7.6, 5.05, 0);
          roof.rotation.z = side * -0.08;
          roof.castShadow = true;
          group.add(roof);

          const strip = new THREE.Mesh(roofStripGeo, neonPurpleMat);
          strip.position.set(side * 5.65, 4.86, 0);
          group.add(strip);
        }

        const lampPole = new THREE.Mesh(lampPoleGeo, poleMat);
        lampPole.position.set(side * 6.4, 3.4, -8);
        group.add(lampPole);

        const lampHead = new THREE.Mesh(lampHeadGeo, neonPurpleMat);
        lampHead.position.set(side * 6.05, 5.95, -8);
        group.add(lampHead);

        const palm = createPalmTree(this.assets);
        palm.position.set(side * 9.8, 0.9, 8);
        palm.scale.setScalar(0.9 + ((i + (side > 0 ? 1 : 0)) % 3) * 0.15);
        group.add(palm);

        for (let b = 0; b < 2; b++) {
          const bh = 16 + ((i * 7 + b * 11 + (side > 0 ? 3 : 0)) % 18);
          const bldg = new THREE.Mesh(
            bldgGeoBase,
            bldgMats[(i + b + (side > 0 ? 2 : 0)) % bldgMats.length]
          );
          bldg.scale.set(1, bh, 1);
          bldg.position.set(side * 16.5, bh * 0.5, b === 0 ? -8 : 8);
          group.add(bldg);
        }
      }

      let hasGFlutonBanner = false;
      if (i % 6 === 4) {
        const tunnelWallL = new THREE.Mesh(tunnelWallGeo, archMat);
        tunnelWallL.position.set(-6.1, 3.1, 0);
        const tunnelWallR = new THREE.Mesh(tunnelWallGeo, archMat);
        tunnelWallR.position.set(6.1, 3.1, 0);
        const tunnelRoof = new THREE.Mesh(tunnelRoofGeo, archMat);
        tunnelRoof.position.set(0, 6.4, 0);
        group.add(tunnelWallL, tunnelWallR, tunnelRoof);

        for (let r = -12; r <= 12; r += 8) {
          const neonRib = new THREE.Mesh(tunnelRibGeo, neonPurpleMat);
          neonRib.position.set(0, 5.75, r);
          group.add(neonRib);
        }
      } else if (i % 2 === 1) {
        const span = new THREE.Mesh(bridgeSpanGeo, bridgeMat);
        span.position.set(0, 6.1, 0);
        span.castShadow = true;
        group.add(span);

        hasGFlutonBanner = i % 4 === 1;
        const sign = new THREE.Mesh(signGeo, hasGFlutonBanner ? signMat1 : signMat2);
        sign.position.set(0, 6.2, 0.58);
        group.add(sign);

        for (const lx of LANE_X) {
          const sig = new THREE.Mesh(sigGeo, lx === 0 ? signalGreenMat : neonPurpleMat);
          sig.position.set(lx, 5.65, 0.56);
          group.add(sig);
        }
      }

      group.position.z = zStart;
      this.chunks.push({
        group,
        zStart,
        hasGFlutonBanner,
        bannerZOffset: 0.58,
        bannerAnnounced: false,
      });
      this.scene.add(group);
    }
  }

  private setupActors(): void {
    const charSkin =
      CHARACTER_SKINS.find((c) => c.id === this.charSkinId) || CHARACTER_SKINS[0];
    this.playerRig = createFlutonCat(charSkin, this.assets);
    this.scene.add(this.playerRig.root);

    const boardSkin =
      HOVERBOARD_SKINS.find((b) => b.id === this.boardSkinId) || HOVERBOARD_SKINS[0];
    this.hoverboardRig = createHoverboard(boardSkin, this.assets);
    this.hoverboardRig.root.visible = false;
    this.scene.add(this.hoverboardRig.root);

    this.officerRig = createSecurityOfficer(this.assets);
    this.officerRig.root.visible = false;
    this.scene.add(this.officerRig.root);

    this.dogRig = createSecurityDog(this.assets);
    this.dogRig.root.visible = false;
    this.scene.add(this.dogRig.root);

    this.shadowTex = createRadialShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1.45, 1.45);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
    this.extraGeos.push(shadowGeo);
    this.extraMats.push(shadowMat);

    this.playerShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadow.rotation.x = -Math.PI / 2;
    this.playerShadow.position.y = 0.03;
    this.scene.add(this.playerShadow);

    this.introTrain = createFuturisticTrain(this.assets, 0, false, false);
    this.introTrain.group.position.set(LANE_X[2] + 0.6, 0, -6);
    this.introTrain.group.visible = false;
    this.scene.add(this.introTrain.group);
  }

  private setupPools(): void {
    // 1. Pre-build Train Pool: 2 per palette x 2 ramp variants = 16 trains
    for (let pal = 0; pal < TRAIN_PALETTES.length; pal++) {
      for (const withRamp of [false, true]) {
        for (let copy = 0; copy < 2; copy++) {
          const built = createFuturisticTrain(this.assets, pal, true, withRamp);
          built.group.visible = false;
          this.scene.add(built.group);
          this.trainPool.push({
            paletteIndex: pal,
            withRamp,
            inUse: false,
            mesh: built.group,
          });
        }
      }
    }

    // 2. Pre-build Barrier / Overhead / Roadblock / Construction Pool
    const counts: Record<StaticBarrierKind, number> = {
      barrier: 10,
      overhead: 10,
      roadblock: 10,
      construction: 8,
    };
    (Object.keys(counts) as StaticBarrierKind[]).forEach((kind) => {
      for (let i = 0; i < counts[kind]; i++) {
        const mesh = createObstacleMesh(kind, this.assets);
        mesh.visible = false;
        this.scene.add(mesh);
        this.barrierPool.push({ kind, inUse: false, mesh });
      }
    });

    // 3. Pre-build Token Pool (110 tokens)
    for (let i = 0; i < 110; i++) {
      const mesh = createFlutonTokenMesh(this.assets);
      mesh.visible = false;
      this.scene.add(mesh);
      this.tokenPool.push({ inUse: false, mesh });
    }

    // 4. Pre-build Fluton Power-Up Pool (2 per ecosystem type = 8)
    const puTypes: CollectiblePowerUpType[] = [
      'fhe',
      'zero_mev',
      'encrypted_intents',
      'confidential_settlement',
    ];
    for (const type of puTypes) {
      for (let c = 0; c < 2; c++) {
        const mesh = createPowerUpMesh(type, this.assets);
        mesh.visible = false;
        this.scene.add(mesh);
        this.powerUpPool.push({ type, inUse: false, mesh });
      }
    }

    // 5. InstancedMesh Particle Pool (1 single draw call for all particles!)
    const pGeo = new THREE.SphereGeometry(0.11, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
    });
    this.extraGeos.push(pGeo);
    this.extraMats.push(pMat);

    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstanced.frustumCulled = false;
    this.particleInstanced.count = 0;
    this.scene.add(this.particleInstanced);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particleStates.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.6,
        colorHex: 0xc084fc,
      });
    }
  }

  public applySkins(charId: CharacterSkinId, boardId: HoverboardSkinId): void {
    this.charSkinId = charId;
    this.boardSkinId = boardId;
    const cSkin = CHARACTER_SKINS.find((c) => c.id === charId) || CHARACTER_SKINS[0];
    this.playerRig.suitMat.color.setHex(cSkin.suitColor);
    this.playerRig.trimMat.color.setHex(cSkin.trimColor);
    this.playerRig.trimMat.emissive.setHex(cSkin.trimColor);
    this.playerRig.glowMat.color.setHex(cSkin.glowColor);

    const bSkin = HOVERBOARD_SKINS.find((b) => b.id === boardId) || HOVERBOARD_SKINS[0];
    this.hoverboardRig.deckMat.color.setHex(bSkin.deckColor);
    this.hoverboardRig.railMat.color.setHex(bSkin.railColor);
    this.hoverboardRig.railMat.emissive.setHex(bSkin.glowColor);
  }

  public updateSavedTotals(bestScore: number, totalTokens: number): void {
    this.bestScore = bestScore;
    this.totalTokens = totalTokens;
    this.emitHud(true);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    const el = this.renderer.domElement;
    el.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    el.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    el.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.phase === 'intro') {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        this.skipIntro();
      }
      return;
    }

    if (this.phase === 'playing' && !this.collisionLocked) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.moveLane(-1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.moveLane(1);
      } else if (e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') {
        e.preventDefault();
        this.jump();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.slide();
      } else if (e.code === 'KeyH' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        this.activateManualHoverboard();
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.pauseGame();
      }
    } else if (this.phase === 'paused') {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        this.resumeGame();
      }
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchStartTime = performance.now();
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.phase !== 'playing' || this.collisionLocked || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    const dt = performance.now() - this.touchStartTime;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < 22 && dt < 280) {
      const now = performance.now();
      if (now - this.lastTapTime < 340) {
        this.activateManualHoverboard();
      }
      this.lastTapTime = now;
      return;
    }

    if (absX > absY) {
      if (dx < -22) this.moveLane(-1);
      else if (dx > 22) this.moveLane(1);
    } else {
      if (dy < -22) this.jump();
      else if (dy > 22) this.slide();
    }
  };

  public moveLane(dir: -1 | 1): void {
    if (this.phase !== 'playing' || this.collisionLocked) return;
    const next = Math.max(-1, Math.min(1, this.targetLane + dir)) as LaneIndex;
    if (next !== this.targetLane) {
      this.targetLane = next;
      audioEngine.playLaneSwitch();
    }
  }

  public jump(): void {
    if (this.phase !== 'playing' || this.collisionLocked) return;
    if (this.isGrounded) {
      this.velY = 12.6;
      this.isGrounded = false;
      this.slideTimer = 0;
      this.rollSpin = 1;
      audioEngine.playJump();
      this.spawnParticles(this.playerX, this.playerY + 0.15, this.playerZ, 0xc084fc, 6, 3);
    }
  }

  public slide(): void {
    if (this.phase !== 'playing' || this.collisionLocked) return;
    if (!this.isGrounded) {
      this.velY = Math.min(this.velY, -21);
    }
    if (this.slideTimer <= 0.1) {
      audioEngine.playSlide();
    }
    this.slideTimer = 0.68;
  }

  public activateManualHoverboard(): void {
    if (this.phase !== 'playing' || this.collisionLocked) return;
    if (this.hoverboardTimer > 0) return;
    if (this.hoverboardCharge < 100) return;

    this.hoverboardCharge = 0;
    this.hoverboardTimer = 10;
    this.powerupsUsedCount++;
    audioEngine.playPowerUp('hoverboard');
    this.showBanner('FLUTON HOVERBOARD ACTIVE');
    this.spawnParticles(this.playerX, this.playerY + 0.4, this.playerZ, 0xa855f7, 14, 5);
  }

  public startNewRun(playIntro = true): void {
    if (this.disposed) return;
    this.phase = 'restarting';
    audioEngine.unlock();
    audioEngine.stopMusic();
    audioEngine.resetForNewRun();

    this.releaseDynamicWorld();
    this.resetChunks();

    this.collisionLocked = false;
    this.gameOverTriggered = false;
    this.collisionTimer = 0;
    this.shakeIntensity = 0;

    this.targetLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.velY = 0;
    this.isGrounded = true;
    this.slideTimer = 0;
    this.rollSpin = 0;
    this.landingSquash = 0;
    this.runCycle = 0;
    this.lastFootstepPhase = 0;

    this.baseSpeed = 16.5;
    this.currentSpeed = 16.5;
    this.distance = 0;
    this.score = 0;
    this.runTokens = 0;
    this.powerupsUsedCount = 0;
    this.nextSpawnZ = -48;

    this.chaseDist = 5.4;
    this.stumbleTimer = 0;
    this.chaseSoundTimer = 3.5;
    this.fheTimer = 0;
    this.zeroMevTimer = 0;
    this.stealthTimer = 0;
    this.settlementTimer = 0;
    this.setStealthVisual(false);
    this.hoverboardTimer = 0;
    this.hasShield = false;
    this.hoverboardCharge = 100;
    this.invulnTimer = 0;
    this.lastPowerUpSpawnZ = -20;
    this.lastPowerUpType = null;
    this.bannerMessage = null;
    this.bannerTimer = 0;
    this.pickupBanner = null;
    this.pickupBannerTimer = 0;

    this.playerRig.sprayCan.visible = false;
    this.playerRig.shieldShell.visible = false;
    this.playerRig.speedRing.visible = false;
    this.playerRig.magnetRing.visible = false;
    this.playerRig.bodyPivot.scale.set(1, 1, 1);
    this.playerRig.bodyPivot.position.set(0, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.hoverboardRig.root.visible = false;

    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.lastCameraFov = 60;
    this.lastTime = performance.now();

    if (playIntro) {
      this.phase = 'intro';
      this.introTime = 0;
      this.introWhistled = false;
      this.introBarked = false;
      this.introSprayed = false;
      this.introSprayDone = false;
      this.setIntroTrainGraffiti(false);
      this.introTrain.group.visible = true;
      this.officerRig.root.visible = true;
      this.dogRig.root.visible = true;
      audioEngine.startMusic();
    } else {
      this.enterActiveGameplay();
    }

    this.emitHud(true);
  }

  private setIntroTrainGraffiti(enabled: boolean): void {
    const sideMat = enabled
      ? this.assets.trainSideGraffitiMats[this.introTrain.paletteIndex]
      : this.assets.trainSideCleanMats[this.introTrain.paletteIndex];
    const mats = this.introTrain.bodyMesh.material as THREE.Material[];
    mats[0] = sideMat;
    mats[1] = sideMat;
  }

  public skipIntro(): void {
    if (this.phase !== 'intro') return;
    this.enterActiveGameplay();
  }

  private enterActiveGameplay(): void {
    this.phase = 'playing';
    this.collisionLocked = false;
    this.gameOverTriggered = false;
    this.introTrain.group.visible = false;
    this.playerRig.sprayCan.visible = false;
    this.playerRig.root.rotation.set(0, 0, 0);
    this.resetChunks();
    this.playerX = LANE_X[1];
    this.playerY = 0;
    this.playerZ = 0;
    this.targetLane = 0;
    this.chaseDist = 5.6;
    this.officerRig.root.visible = true;
    this.dogRig.root.visible = true;
    this.nextSpawnZ = -45;
    this.populateAhead();
    audioEngine.startMusic();
    this.showBanner('RUN! DODGE THE gFLUTON TRAINS!');
    this.emitHud(true);
  }

  public pauseGame(): void {
    if (this.phase === 'playing' && !this.collisionLocked) {
      this.phase = 'paused';
      audioEngine.setBoostTempo(false);
      audioEngine.stopBannerVoice();
      this.emitHud(true);
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      audioEngine.unlock();
      this.phase = 'playing';
      this.lastTime = performance.now();
      this.emitHud(true);
    }
  }

  public returnToMenu(): void {
    this.releaseDynamicWorld();
    this.resetChunks();
    this.phase = 'menu';
    this.collisionLocked = false;
    this.gameOverTriggered = false;
    this.playerX = 0;
    this.playerY = 0;
    this.playerZ = 0;
    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.position.set(0, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.scale.set(1, 1, 1);
    this.fheTimer = 0;
    this.zeroMevTimer = 0;
    this.stealthTimer = 0;
    this.settlementTimer = 0;
    this.hasShield = false;
    this.hoverboardTimer = 0;
    this.pickupBanner = null;
    this.pickupBannerTimer = 0;
    this.bannerMessage = null;
    this.setStealthVisual(false);
    this.playerRig.sprayCan.visible = false;
    this.playerRig.shieldShell.visible = false;
    this.playerRig.speedRing.visible = false;
    this.playerRig.magnetRing.visible = false;
    this.hoverboardRig.root.visible = true;
    this.hoverboardRig.root.position.set(0, 0.18, 0);
    this.officerRig.root.visible = false;
    this.dogRig.root.visible = false;
    this.introTrain.group.visible = false;
    audioEngine.setBoostTempo(false);
    audioEngine.stopMusic();
    audioEngine.stopBannerVoice();
    this.emitHud(true);
  }

  private resetChunks(): void {
    for (let i = 0; i < this.chunks.length; i++) {
      this.chunks[i].zStart = 20 - i * CHUNK_LEN;
      this.chunks[i].group.position.z = this.chunks[i].zStart;
      this.chunks[i].bannerAnnounced = false;
    }
  }

  private releaseDynamicWorld(): void {
    for (const o of this.obstacles) {
      o.mesh.visible = false;
      if (o.trainPoolSlot) o.trainPoolSlot.inUse = false;
      if (o.barrierPoolSlot) o.barrierPoolSlot.inUse = false;
    }
    for (const t of this.tokens) {
      t.mesh.visible = false;
      t.slot.inUse = false;
    }
    for (const p of this.powerUps) {
      p.mesh.visible = false;
      p.slot.inUse = false;
    }
    for (const ps of this.particleStates) {
      ps.active = false;
    }
    this.particleInstanced.count = 0;
    this.obstacles.length = 0;
    this.tokens.length = 0;
    this.powerUps.length = 0;
  }

  private showBanner(msg: string): void {
    this.bannerMessage = msg;
    this.bannerTimer = 2.0;
  }

  private stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = 0;
    }
  }

  private startLoop(): void {
    this.stopLoop();
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.timeoutId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.timeoutId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.timeoutId = window.setTimeout(cb, 80);
      }
    };
    this.timeoutId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    // Freeze simulation completely while paused, gameover, or restarting
    if (this.phase === 'paused' || this.phase === 'gameover' || this.phase === 'restarting') {
      return;
    }

    this.elapsed += dt;

    // Drift background clouds during active states
    for (const c of this.clouds) {
      if (!c.visible) continue;
      c.position.z += dt * 1.4;
      if (c.position.z > this.playerZ + 40) {
        c.position.z = this.playerZ - 220;
      }
    }

    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.bannerMessage = null;
    }

    if (this.phase === 'menu') {
      this.updateMenuShowcase(dt);
    } else if (this.phase === 'intro') {
      this.updateIntro(dt);
      this.updateParticles(dt);
    } else if (this.phase === 'playing') {
      this.updateGameplay(dt);
      this.updateParticles(dt);
    } else if (this.phase === 'collision') {
      this.updateCollisionSequence(dt);
      this.updateParticles(dt);
    }

    // Keep sun shadow frustum centered near player
    this.sunLight.position.set(this.playerX + 18, 28, this.playerZ + 12);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ - 14);
    this.sunLight.target.updateMatrixWorld();

    if (this.elapsed - this.lastHudEmit > 0.055) {
      this.emitHud(false);
    }
  }

  private updateMenuShowcase(dt: number): void {
    const hoverY = 0.24 + Math.sin(this.elapsed * 2.6) * 0.06;
    this.hoverboardRig.root.visible = true;
    this.hoverboardRig.root.position.set(0, hoverY, 0);
    this.hoverboardRig.root.rotation.set(0, this.elapsed * 0.65, 0);

    this.playerRig.root.position.set(0, hoverY + 0.06, 0);
    this.playerRig.root.rotation.set(0, this.elapsed * 0.65 + Math.PI, 0);
    this.animateHoverboardPose(dt);
    this.playerShadow.position.set(0, 0.03, 0);

    this.camera.position.set(2.3, 2.05, 4.35);
    this.camera.lookAt(0, 1.18, 0);
  }

  private updateIntro(dt: number): void {
    this.introTime += dt;
    const t = this.introTime;

    if (t < 1.6) {
      const p = t / 1.6;
      const x = THREE.MathUtils.lerp(4.8, 2.15, p);
      const z = THREE.MathUtils.lerp(1.5, -5.2, p);
      this.playerRig.root.position.set(x, 0, z);
      this.playerRig.root.rotation.set(0, -0.45, 0);
      this.playerRig.sprayCan.visible = false;
      this.animateRunCycle(dt * 0.65, false);

      this.officerRig.root.position.set(8.5, 0, 4);
      this.dogRig.root.position.set(9.4, 0, 4.4);

      this.camera.position.set(-1.8, 1.85, -1.6);
      this.camera.lookAt(x, 1.1, z);
    } else if (t < 3.4) {
      const x = 2.15;
      const z = -5.2;
      this.playerRig.root.position.set(x, 0, z);
      this.playerRig.root.rotation.set(0, -Math.PI / 2, 0);
      this.playerRig.sprayCan.visible = true;

      this.playerRig.rightArm.rotation.x = -1.45 + Math.sin(t * 14) * 0.28;
      this.playerRig.rightArm.rotation.z = Math.cos(t * 10) * 0.22;
      this.playerRig.leftArm.rotation.x = 0.15;
      this.playerRig.leftLeg.rotation.x = 0;
      this.playerRig.rightLeg.rotation.x = 0;
      this.animateTail(t * 5);

      if (!this.introSprayed) {
        this.introSprayed = true;
        audioEngine.playSprayPaint();
      }
      if (Math.random() < 0.5) {
        this.spawnParticles(
          x + 0.9,
          1.35 + (Math.random() - 0.5) * 0.4,
          z + (Math.random() - 0.5) * 1.4,
          0xa855f7,
          2,
          1.8
        );
      }
      if (t > 2.25 && !this.introSprayDone) {
        this.introSprayDone = true;
        this.setIntroTrainGraffiti(true);
      }

      this.camera.position.set(-1.3, 1.8, -1.4);
      this.camera.lookAt(x + 1.2, 1.35, z);
    } else if (t < 5.6) {
      this.playerRig.sprayCan.visible = false;
      this.playerRig.root.position.set(2.15, 0, -5.2);
      this.playerRig.root.rotation.set(0, Math.PI * 0.85, 0);
      this.playerRig.rightArm.rotation.x = -0.35;
      this.playerRig.leftArm.rotation.x = -0.35;

      const p = Math.min(1, (t - 3.4) / 1.4);
      const offZ = THREE.MathUtils.lerp(4.0, -0.5, p);
      this.officerRig.root.position.set(4.5, 0, offZ);
      this.officerRig.root.rotation.set(0, 0.35, 0);
      this.dogRig.root.position.set(5.45, 0, offZ + 0.4);
      this.dogRig.root.rotation.set(0, 0.35, 0);

      this.animateChasers(dt, 0, false);

      if (t > 3.7 && !this.introWhistled) {
        this.introWhistled = true;
        audioEngine.playPoliceWhistle();
      }
      if (t > 4.35 && !this.introBarked) {
        this.introBarked = true;
        audioEngine.playDogBark();
      }

      this.camera.position.set(0.6, 2.25, -7.8);
      this.camera.lookAt(3.8, 1.25, -1.5);
    } else {
      const p = Math.min(1, (t - 5.6) / 2.2);
      const sprintDist = (t - 5.6) * 14.5;
      this.playerX = THREE.MathUtils.lerp(2.15, 0, Math.min(1, p * 1.4));
      this.playerZ = -5.2 - sprintDist;
      this.playerY = p < 0.35 ? Math.sin((p / 0.35) * Math.PI) * 1.2 : 0;

      this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.playerRig.root.rotation.set(0, 0, 0);
      this.animateRunCycle(dt, true);

      this.officerRig.root.position.set(this.playerX - 0.6, 0, this.playerZ + 5.2);
      this.officerRig.root.rotation.set(0, 0, 0);
      this.dogRig.root.position.set(this.playerX + 0.65, 0, this.playerZ + 4.9);
      this.dogRig.root.rotation.set(0, 0, 0);
      this.animateChasers(dt, 0, true);

      const targetCamPos = _vec3.set(this.playerX * 0.5, 4.4, this.playerZ + 7.6);
      this.camera.position.lerp(targetCamPos, 1 - Math.exp(-5.5 * dt));
      const lookPos = _vec3B.set(this.playerX * 0.35, 1.35, this.playerZ - 12);
      this.camera.lookAt(lookPos);

      this.recycleChunks();

      if (t >= 7.8) {
        this.playerZ = Math.round(this.playerZ);
        this.enterActiveGameplay();
      }
    }

    this.playerShadow.position.set(
      this.playerRig.root.position.x,
      0.03,
      this.playerRig.root.position.z
    );
  }

  private updateGameplay(dt: number): void {
    // Extra safety guard: NEVER run gameplay updates if collision already triggered
    if (this.collisionLocked || this.phase !== 'playing') return;

    if (this.pickupBannerTimer > 0) {
      this.pickupBannerTimer -= dt;
      if (this.pickupBannerTimer <= 0) {
        this.pickupBanner = null;
      }
    }

    if (this.fheTimer > 0) {
      this.fheTimer = Math.max(0, this.fheTimer - dt);
      if (this.fheTimer <= 0) {
        this.hasShield = false;
      }
    }

    if (this.settlementTimer > 0) {
      this.settlementTimer = Math.max(0, this.settlementTimer - dt);
      if (Math.random() < 0.25) {
        const angle = Math.random() * Math.PI * 2;
        this.spawnParticles(
          this.playerX + Math.cos(angle) * 0.75,
          this.playerY + 0.95,
          this.playerZ + Math.sin(angle) * 0.75,
          0xe879f9,
          1,
          1.4
        );
      }
    }

    if (this.stealthTimer > 0) {
      this.stealthTimer = Math.max(0, this.stealthTimer - dt);
      if (Math.random() < 0.35) {
        this.spawnParticles(
          this.playerX + (Math.random() - 0.5) * 0.6,
          this.playerY + 0.5 + Math.random() * 0.9,
          this.playerZ + 0.2,
          0xa855f7,
          1,
          1.8
        );
      }
      if (this.stealthTimer <= 0) {
        this.setStealthVisual(false);
      }
    }

    if (this.hoverboardTimer > 0) this.hoverboardTimer = Math.max(0, this.hoverboardTimer - dt);
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.landingSquash > 0) this.landingSquash = Math.max(0, this.landingSquash - dt * 5.2);

    if (this.zeroMevTimer > 0) {
      this.zeroMevTimer = Math.max(0, this.zeroMevTimer - dt);
      audioEngine.setBoostTempo(true);
      if (Math.random() < 0.85) {
        this.spawnParticles(
          this.playerX + (Math.random() - 0.5) * 0.65,
          this.playerY + 0.65 + Math.random() * 0.75,
          this.playerZ + 0.45,
          Math.random() < 0.5 ? 0xe879f9 : 0xc084fc,
          2,
          3.1
        );
      }
    } else {
      audioEngine.setBoostTempo(false);
    }

    if (this.hoverboardTimer <= 0 && this.hoverboardCharge < 100) {
      this.hoverboardCharge = Math.min(100, this.hoverboardCharge + dt * 5.5);
    }

    this.baseSpeed = Math.min(33, 16.5 + this.distance * 0.0085);
    const targetSpeed = this.zeroMevTimer > 0 ? this.baseSpeed + 13.5 : this.baseSpeed;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 6, dt);

    const stepZ = this.currentSpeed * dt;
    const prevPlayerZ = this.playerZ;
    this.playerZ -= stepZ;
    this.distance += stepZ;
    this.score += stepZ * 2.2;
    this.checkGFlutonBannerCrossings(prevPlayerZ, this.playerZ);

    const targetX = LANE_X[this.targetLane + 1];
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 15, dt);
    const lateralVel = (this.playerX - prevX) / dt;

    const groundY = this.computeGroundY(this.playerX, this.playerZ);

    if (!this.isGrounded || this.playerY > groundY + 0.04) {
      this.velY -= 32 * dt;
      this.playerY += this.velY * dt;
      if (this.playerY <= groundY) {
        this.playerY = groundY;
        this.velY = 0;
        if (!this.isGrounded) {
          this.isGrounded = true;
          this.landingSquash = 1.0;
          audioEngine.playLand();
          this.spawnParticles(this.playerX, this.playerY + 0.1, this.playerZ, 0xe2e8f0, 5, 2);
        }
      }
    } else {
      this.playerY = groundY;
      this.velY = 0;
      this.isGrounded = true;
    }

    if (this.slideTimer > 0) this.slideTimer = Math.max(0, this.slideTimer - dt);
    if (this.rollSpin > 0) this.rollSpin = Math.max(0, this.rollSpin - dt * 2.4);

    // Check collisions BEFORE applying further rewards so fatal hit stops immediately!
    const collided = this.updateObstaclesAndCollisions(dt);
    if (collided || this.collisionLocked || this.phase !== 'playing') {
      return;
    }

    // Position player rig (ALWAYS facing -Z away from camera)
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.rotation.set(
      0,
      0,
      THREE.MathUtils.clamp(-lateralVel * 0.025, -0.28, 0.28)
    );
    const squashFactor = this.landingSquash * 0.16;
    this.playerRig.bodyPivot.scale.set(1 + squashFactor * 0.6, 1 - squashFactor, 1 + squashFactor * 0.6);

    this.playerRig.shieldShell.visible = this.hasShield || this.invulnTimer > 0;
    this.playerRig.shieldShell.rotation.y += dt * 2.5;

    const onBoard = this.hoverboardTimer > 0;
    this.playerRig.speedRing.visible = onBoard || this.zeroMevTimer > 0;
    if (this.playerRig.speedRing.visible) {
      this.playerRig.speedRing.scale.setScalar(1 + Math.sin(this.elapsed * 14) * 0.12);
    }

    this.playerRig.magnetRing.visible = this.settlementTimer > 0;
    if (this.playerRig.magnetRing.visible) {
      this.playerRig.magnetRing.rotation.z += dt * 4.2;
      this.playerRig.magnetRing.scale.setScalar(1 + Math.sin(this.elapsed * 10) * 0.08);
    }

    this.hoverboardRig.root.visible = onBoard;
    if (onBoard) {
      const floatOff = 0.14 + Math.sin(this.elapsed * 9) * 0.04;
      this.hoverboardRig.root.position.set(this.playerX, this.playerY + floatOff, this.playerZ);
      this.hoverboardRig.root.rotation.set(
        this.isGrounded ? 0 : THREE.MathUtils.clamp(this.velY * 0.02, -0.25, 0.25),
        0,
        THREE.MathUtils.clamp(-lateralVel * 0.035, -0.35, 0.35)
      );
      this.hoverboardRig.thrusterLeft.scale.z = 0.8 + Math.sin(this.elapsed * 32) * 0.28;
      this.hoverboardRig.thrusterRight.scale.z = 0.8 + Math.cos(this.elapsed * 32) * 0.28;
      this.playerRig.root.position.y += floatOff + 0.04;
      this.animateHoverboardPose(dt);
      if (Math.random() < 0.55) {
        this.spawnParticles(
          this.playerX,
          this.playerY + 0.18,
          this.playerZ + 0.85,
          0xa855f7,
          1,
          1.5
        );
      }
    } else if (this.slideTimer > 0 && this.isGrounded) {
      this.animateSlidePose();
    } else if (!this.isGrounded) {
      this.animateJumpPose();
    } else {
      this.animateRunCycle(dt, true, groundY > 1);
    }

    this.playerShadow.position.set(this.playerX, groundY + 0.03, this.playerZ);
    const heightAboveGround = Math.max(0, this.playerY - groundY);
    const shadowScale = Math.max(0.45, 1 - heightAboveGround * 0.12);
    this.playerShadow.scale.setScalar(shadowScale);

    this.updateTokens(dt);
    this.updatePowerUps(dt);
    this.updateChase(dt);
    this.recycleChunks();
    this.populateAhead();

    const targetFov = this.zeroMevTimer > 0 ? 70 : 60 + (this.currentSpeed - 16.5) * 0.25;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    if (Math.abs(this.camera.fov - this.lastCameraFov) > 0.06) {
      this.camera.updateProjectionMatrix();
      this.lastCameraFov = this.camera.fov;
    }

    const camTargetX = this.playerX * 0.58;
    const camTargetY = this.playerY + 4.35;
    const camTargetZ = this.playerZ + 7.65;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camTargetX, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camTargetY, 8, dt);
    this.camera.position.z = camTargetZ;
    this.camera.lookAt(this.playerX * 0.42, this.playerY + 1.45, this.playerZ - 12);
  }

  private computeGroundY(px: number, pz: number): number {
    let bestY = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.kind !== 'train_static' && obs.kind !== 'train_moving') continue;
      if (Math.abs(px - LANE_X[obs.lane + 1]) > 1.38) continue;

      const halfL = obs.length * 0.5;
      const frontZ = obs.z + halfL;
      const backZ = obs.z - halfL;

      if (pz <= frontZ && pz >= backZ && this.playerY >= TRAIN_HEIGHT - 0.65) {
        bestY = Math.max(bestY, TRAIN_HEIGHT);
      } else if (obs.withRamp && pz <= frontZ + 4.2 && pz > frontZ) {
        const rampProgress = (frontZ + 4.2 - pz) / 4.2;
        const rampY = THREE.MathUtils.clamp(rampProgress, 0, 1) * TRAIN_HEIGHT;
        if (this.playerY >= rampY - 0.7) {
          bestY = Math.max(bestY, rampY);
        }
      }
    }
    return bestY;
  }

  private releaseObstacleAt(index: number): void {
    const obs = this.obstacles[index];
    obs.mesh.visible = false;
    if (obs.trainPoolSlot) obs.trainPoolSlot.inUse = false;
    if (obs.barrierPoolSlot) obs.barrierPoolSlot.inUse = false;
    this.obstacles.splice(index, 1);
  }

  /**
   * Returns true if a fatal collision occurred on this frame.
   */
  private updateObstaclesAndCollisions(dt: number): boolean {
    if (this.collisionLocked || this.phase !== 'playing') return true;

    const playerHalfW = 0.34;
    const playerHeight = this.slideTimer > 0 && this.isGrounded ? 0.72 : 1.55;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      if (obs.speed > 0) {
        obs.z += obs.speed * dt;
        obs.mesh.position.z = obs.z;

        if (!obs.honked && obs.z > this.playerZ - 36 && obs.z < this.playerZ - 12) {
          obs.honked = true;
          audioEngine.playTrainHorn();
        }
      }

      if (obs.z > this.playerZ + 26) {
        this.releaseObstacleAt(i);
        continue;
      }

      if (this.invulnTimer > 0) continue;

      const obsX = LANE_X[obs.lane + 1];
      const dx = Math.abs(this.playerX - obsX);
      const dz = Math.abs(this.playerZ - obs.z);
      const halfL = obs.length * 0.5;
      const halfW = obs.width * 0.5;

      // Spatial AABB broad-phase check
      if (dx > halfW + playerHalfW || dz > halfL + 0.38) continue;

      const playerBottom = this.playerY;
      const playerTop = this.playerY + playerHeight;

      if (obs.kind === 'overhead') {
        if (playerTop <= obs.clearanceY || playerBottom >= obs.height) continue;
      } else {
        if (playerBottom >= obs.height - 0.38) continue;
        if (obs.withRamp && this.playerZ > obs.z + halfL - 0.4) continue;
      }

      // 1. ZERO MEV speed boost invincibly blasts obstacles aside
      if (this.zeroMevTimer > 0) {
        this.spawnParticles(obsX, 1.4, obs.z, 0xc084fc, 14, 7.5);
        this.releaseObstacleAt(i);
        audioEngine.playShieldSave();
        continue;
      }

      // 2. ENCRYPTED INTENTS stealth mode safely phases past obstacles/trains
      if (this.stealthTimer > 0) {
        audioEngine.playStealthPhase();
        if (Math.random() < 0.45) {
          this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0xa855f7, 2, 2.6);
        }
        continue;
      }

      // 3. Hoverboard or FHE Shield protection absorbs hit BEFORE fatal Game Over
      if (this.hoverboardTimer > 0 || this.hasShield) {
        if (this.hoverboardTimer > 0) {
          this.hoverboardTimer = 0;
          this.hoverboardRig.root.visible = false;
          this.showBanner('HOVERBOARD SAVED YOU!');
        } else {
          this.hasShield = false;
          this.fheTimer = 0;
          this.showBanner('FHE SHIELD ABSORBED HIT!');
        }
        this.invulnTimer = 1.45;
        this.chaseDist = 3.2;
        audioEngine.playShieldSave();
        this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0xa855f7, 18, 6.5);
        if (obs.kind !== 'train_static' && obs.kind !== 'train_moving') {
          this.releaseObstacleAt(i);
        }
        continue;
      }

      // 4. Side-glancing train scrape causes stumble once; second hit or head-on is fatal
      const isGlancing = dx > halfW * 0.68 && this.stumbleTimer <= 0;
      if (isGlancing && (obs.kind === 'train_static' || obs.kind === 'train_moving')) {
        this.stumbleTimer = 3.2;
        this.invulnTimer = 0.85;
        this.chaseDist = 2.6;
        const pushDir = this.playerX < obsX ? -1 : 1;
        this.targetLane = THREE.MathUtils.clamp(this.targetLane + pushDir, -1, 1) as LaneIndex;
        audioEngine.playStumble();
        audioEngine.playDogBark();
        this.showBanner('CLOSE CALL! WATCH OUT!');
        continue;
      }

      // 5. Fatal Collision -> IMMEDIATELY stop all movement & enter COLLISION sequence!
      this.triggerCollision();
      return true;
    }

    return false;
  }

  private setStealthVisual(active: boolean): void {
    if (this.isStealthVisualActive === active) return;
    this.isStealthVisualActive = active;

    const mats = [
      this.playerRig.furMat,
      this.playerRig.suitMat,
      this.playerRig.shirtMat,
      this.playerRig.trimMat,
    ];
    for (const mat of mats) {
      mat.transparent = active;
      mat.opacity = active ? 0.56 : 1;
      mat.depthWrite = !active;
      mat.needsUpdate = true;
    }

    if (active) {
      this.playerRig.furMat.emissive.setHex(0x6b21a8);
      this.playerRig.furMat.emissiveIntensity = 0.72;
      this.playerRig.suitMat.emissive.setHex(0x581c87);
      this.playerRig.suitMat.emissiveIntensity = 0.65;
      this.playerRig.shirtMat.emissive.setHex(0xc084fc);
      this.playerRig.shirtMat.emissiveIntensity = 0.45;
    } else {
      this.playerRig.furMat.emissive.setHex(0x000000);
      this.playerRig.furMat.emissiveIntensity = 0;
      this.playerRig.suitMat.emissive.setHex(0x000000);
      this.playerRig.suitMat.emissiveIntensity = 0;
      this.playerRig.shirtMat.emissive.setHex(0x000000);
      this.playerRig.shirtMat.emissiveIntensity = 0;
    }
  }

  private triggerCollision(): void {
    if (this.phase !== 'playing' || this.collisionLocked) return;

    this.collisionLocked = true;
    this.phase = 'collision';
    this.collisionTimer = 0;
    this.shakeIntensity = 0.42;

    // Immediately halt player velocity, timers & active powers
    this.currentSpeed = 0;
    this.velY = 0;
    this.slideTimer = 0;
    this.rollSpin = 0;
    this.fheTimer = 0;
    this.zeroMevTimer = 0;
    this.stealthTimer = 0;
    this.settlementTimer = 0;
    this.hasShield = false;
    this.setStealthVisual(false);
    this.hoverboardTimer = 0;
    this.hoverboardRig.root.visible = false;
    this.playerRig.speedRing.visible = false;
    this.playerRig.shieldShell.visible = false;
    this.playerRig.magnetRing.visible = false;
    this.bannerMessage = null;
    this.pickupBanner = null;
    this.pickupBannerTimer = 0;

    // Slight step-back from point of impact so cat doesn't clip deep inside front mesh
    this.playerZ += 0.45;
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);

    audioEngine.setBoostTempo(false);
    audioEngine.stopBannerVoice();
    audioEngine.playCollisionImpact();

    this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0xef4444, 18, 6.5);
    this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 0xc084fc, 10, 5);

    this.emitHud(true);
  }

  private updateCollisionSequence(dt: number): void {
    this.collisionTimer += dt;
    const p = Math.min(1, this.collisionTimer / COLLISION_DURATION);

    // Drop cat to ground/surface cleanly if hit mid-air
    const groundY = this.computeGroundY(this.playerX, this.playerZ);
    if (this.playerY > groundY) {
      this.playerY = Math.max(groundY, this.playerY - 14 * dt);
    }

    // Impact stumble pose (knocked backward tilt, flailing arms, stunned head)
    this.playerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.position.y = Math.sin(p * Math.PI) * 0.14;
    this.playerRig.bodyPivot.rotation.set(-0.38 * Math.sin(p * Math.PI * 0.65), 0, Math.sin(p * 18) * 0.08);
    this.playerRig.bodyPivot.scale.set(1, 1, 1);
    this.playerRig.leftArm.rotation.x = -1.25;
    this.playerRig.rightArm.rotation.x = -1.15;
    this.playerRig.leftArm.rotation.z = 0.55;
    this.playerRig.rightArm.rotation.z = -0.55;
    this.playerRig.leftLeg.rotation.x = 0.2;
    this.playerRig.rightLeg.rotation.x = -0.25;
    this.playerShadow.position.set(this.playerX, groundY + 0.03, this.playerZ);

    // Security officer & dog rush up directly behind the player and stop!
    const offZ = THREE.MathUtils.lerp(this.playerZ + 3.2, this.playerZ + 1.35, Math.min(1, p * 1.4));
    const dogZ = THREE.MathUtils.lerp(this.playerZ + 2.9, this.playerZ + 1.12, Math.min(1, p * 1.4));
    this.officerRig.root.position.set(this.playerX - 0.62, 0, offZ);
    this.dogRig.root.position.set(this.playerX + 0.62, 0, dogZ);
    if (p < 0.72) {
      this.animateChasers(dt, 0, true);
    } else {
      this.animateChasers(dt, 0, false);
    }

    // Impact camera shake + slight dramatic zoom
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 0.9);
    const sx = (Math.random() - 0.5) * this.shakeIntensity;
    const sy = (Math.random() - 0.5) * this.shakeIntensity;
    this.camera.position.set(
      this.playerX * 0.55 + sx,
      this.playerY + 3.9 + sy,
      this.playerZ + 6.8
    );
    this.camera.lookAt(this.playerX * 0.5, this.playerY + 1.25, this.playerZ - 4);

    if (this.collisionTimer >= COLLISION_DURATION) {
      this.finalizeGameOver();
    }
  }

  private finalizeGameOver(): void {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.phase = 'gameover';
    this.currentSpeed = 0;

    audioEngine.setBoostTempo(false);
    audioEngine.playGameOver();

    const finalStats = {
      runScore: Math.floor(this.score),
      runTokens: this.runTokens,
      runDistance: Math.floor(this.distance),
      powerupsUsed: this.powerupsUsedCount,
    };
    this.bestScore = Math.max(this.bestScore, finalStats.runScore);
    this.totalTokens += finalStats.runTokens;
    this.onRunFinished(finalStats);
    this.emitHud(true);
  }

  private updateTokens(dt: number): void {
    if (this.collisionLocked || this.phase !== 'playing') return;

    const magnetActive = this.settlementTimer > 0;

    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const tok = this.tokens[i];
      if (tok.z > this.playerZ + 14) {
        tok.mesh.visible = false;
        tok.slot.inUse = false;
        this.tokens.splice(i, 1);
        continue;
      }

      tok.mesh.rotation.y += dt * 3.4;

      const dx = tok.x - this.playerX;
      const dy = tok.y - (this.playerY + 0.9);
      const dz = tok.z - this.playerZ;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (magnetActive && !tok.collected && distSq < 185) {
        tok.magnetized = true;
      }

      if (tok.magnetized) {
        tok.x = THREE.MathUtils.damp(tok.x, this.playerX, 15, dt);
        tok.y = THREE.MathUtils.damp(tok.y, this.playerY + 0.95, 15, dt);
        tok.z = THREE.MathUtils.damp(tok.z, this.playerZ, 17, dt);
        tok.mesh.position.set(tok.x, tok.y, tok.z);
      }

      const hitDistSq =
        (tok.x - this.playerX) ** 2 +
        (tok.y - (this.playerY + 0.9)) ** 2 +
        (tok.z - this.playerZ) ** 2;

      if (hitDistSq < 1.35) {
        tok.collected = true;
        this.runTokens += 1;
        this.score += 15;
        audioEngine.playTokenCollect();
        this.spawnParticles(tok.x, tok.y, tok.z, 0xc084fc, 5, 3.8);
        tok.mesh.visible = false;
        tok.slot.inUse = false;
        this.tokens.splice(i, 1);
      }
    }
  }

  private updatePowerUps(dt: number): void {
    if (this.collisionLocked || this.phase !== 'playing') return;

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];

      if (pu.collected) {
        pu.collectAnim += dt;
        const p = Math.min(1, pu.collectAnim / 0.18);
        const s = Math.max(0.01, 1 - p);
        pu.mesh.scale.setScalar(s);
        pu.mesh.position.y += dt * 3.8;
        const spinObj = pu.mesh.userData.spinGroup as THREE.Object3D | undefined;
        if (spinObj) spinObj.rotation.y += dt * 14;
        if (p >= 1) {
          pu.mesh.visible = false;
          pu.mesh.scale.setScalar(1);
          pu.slot.inUse = false;
          this.powerUps.splice(i, 1);
        }
        continue;
      }

      if (pu.z > this.playerZ + 14) {
        pu.mesh.visible = false;
        pu.mesh.scale.setScalar(1);
        pu.slot.inUse = false;
        this.powerUps.splice(i, 1);
        continue;
      }

      // Spin ONLY the 3D power-up body so the overhead camera-facing label stays readable!
      const spinObj = pu.mesh.userData.spinGroup as THREE.Object3D | undefined;
      if (spinObj) {
        spinObj.rotation.y += dt * 2.5;
      }
      pu.mesh.position.y = pu.y + Math.sin(this.elapsed * 4 + i) * 0.14;

      const px = LANE_X[pu.lane + 1];
      const distSq =
        (px - this.playerX) ** 2 +
        (pu.y - (this.playerY + 0.95)) ** 2 +
        (pu.z - this.playerZ) ** 2;

      if (distSq < 1.65) {
        // Lock immediately so +10 coins and power-up trigger EXACTLY ONCE per pickup
        pu.collected = true;
        pu.collectAnim = 0.001;
        this.activatePowerUp(pu.type);
        this.spawnParticles(px, pu.y, pu.z, 0xe879f9, 16, 6.2);
      }
    }
  }

  private activatePowerUp(type: CollectiblePowerUpType): void {
    this.powerupsUsedCount++;

    // Core Reward Mechanic: award EXACTLY 10 bonus Fluton logo coins per pickup
    this.runTokens += 10;
    audioEngine.playPowerUp(type);
    audioEngine.playBonusCoinsReward();

    if (type === 'fhe') {
      this.fheTimer = 10;
      this.hasShield = true;
      this.pickupBanner = {
        id: this.nextPickupBannerId++,
        type: 'fhe',
        title: 'FHE',
        subtitle: 'Fully Homomorphic Encryption Shield',
        bonusText: '+10 FLUTON COINS',
      };
      this.pickupBannerTimer = 2.4;
      this.spawnParticles(this.playerX, this.playerY + 1.1, this.playerZ, 0xa855f7, 14, 4.5);
    } else if (type === 'zero_mev') {
      this.zeroMevTimer = 6;
      this.pickupBanner = {
        id: this.nextPickupBannerId++,
        type: 'zero_mev',
        title: 'ZERO MEV',
        subtitle: 'Lightning Speed Boost',
        bonusText: '+10 FLUTON COINS',
      };
      this.pickupBannerTimer = 2.4;
      this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0xe879f9, 16, 6.5);
    } else if (type === 'encrypted_intents') {
      this.stealthTimer = 8;
      this.setStealthVisual(true);
      this.pickupBanner = {
        id: this.nextPickupBannerId++,
        type: 'encrypted_intents',
        title: 'ENCRYPTED INTENTS',
        subtitle: 'Stealth Phase Protection',
        bonusText: '+10 FLUTON COINS',
      };
      this.pickupBannerTimer = 2.4;
      this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0x9333ea, 16, 4.8);
    } else if (type === 'confidential_settlement') {
      this.settlementTimer = 10;
      this.pickupBanner = {
        id: this.nextPickupBannerId++,
        type: 'confidential_settlement',
        title: 'CONFIDENTIAL SETTLEMENT',
        subtitle: 'Orbital Coin Magnet',
        bonusText: '+10 FLUTON COINS',
      };
      this.pickupBannerTimer = 2.4;
      this.spawnParticles(this.playerX, this.playerY + 1.0, this.playerZ, 0xf0abfc, 16, 5.2);
    }

    this.emitHud(true);
  }

  private updateChase(dt: number): void {
    if (this.collisionLocked || this.phase !== 'playing') return;

    const targetChase = this.stumbleTimer > 0 ? 2.75 : 5.5;
    this.chaseDist = THREE.MathUtils.damp(this.chaseDist, targetChase, 1.4, dt);

    const chaserZ = this.playerZ + this.chaseDist;
    const offX = THREE.MathUtils.damp(this.officerRig.root.position.x, this.playerX - 0.58, 6, dt);
    const dogX = THREE.MathUtils.damp(this.dogRig.root.position.x, this.playerX + 0.62, 7.5, dt);

    let jumpH = 0;
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.kind === 'barrier' || obs.kind === 'roadblock') {
        const dz = Math.abs(chaserZ - obs.z);
        if (dz < 1.5) {
          jumpH = Math.max(jumpH, Math.cos((dz / 1.5) * (Math.PI / 2)) * 1.15);
        }
      }
    }

    this.officerRig.root.position.set(offX, jumpH, chaserZ);
    this.officerRig.root.rotation.set(0, 0, 0);
    this.dogRig.root.position.set(dogX, jumpH * 0.9, chaserZ - 0.35);
    this.dogRig.root.rotation.set(0, 0, 0);

    this.animateChasers(dt, jumpH, true);

    this.chaseSoundTimer -= dt;
    if (this.chaseSoundTimer <= 0) {
      this.chaseSoundTimer = 6.5 + Math.random() * 5;
      if (Math.random() < 0.55) audioEngine.playDogBark();
      else audioEngine.playPoliceWhistle();
    }
  }

  private checkGFlutonBannerCrossings(prevZ: number, currZ: number): void {
    if (this.collisionLocked || this.phase !== 'playing') return;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (!chunk.hasGFlutonBanner || chunk.bannerAnnounced) continue;
      const bannerWorldZ = chunk.zStart + chunk.bannerZOffset;
      if (prevZ > bannerWorldZ && currZ <= bannerWorldZ) {
        chunk.bannerAnnounced = true;
        audioEngine.playGFlutonBannerVoice();
      }
    }
  }

  private recycleChunks(): void {
    const totalSpan = NUM_CHUNKS * CHUNK_LEN;
    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      if (chunk.zStart > this.playerZ + CHUNK_LEN * 1.2) {
        chunk.zStart -= totalSpan;
        chunk.group.position.z = chunk.zStart;
        chunk.bannerAnnounced = false;
      }
    }
  }

  private populateAhead(): void {
    const horizon = this.quality === 'low' ? 135 : 165;
    while (this.nextSpawnZ > this.playerZ - horizon) {
      this.spawnWaveAt(this.nextSpawnZ);
      const spacing = Math.max(22, 31 - this.distance * 0.004);
      this.nextSpawnZ -= spacing;
    }
  }

  private spawnWaveAt(z: number): void {
    const roll = Math.random();

    if (roll < 0.34) {
      const openLane = (Math.floor(Math.random() * 3) - 1) as LaneIndex;
      const lanes: LaneIndex[] = [-1, 0, 1];
      for (const lane of lanes) {
        if (lane === openLane) {
          this.spawnTokenLine(lane, 0.9, z + 6, z - 8, 5);
          continue;
        }
        if (Math.random() < 0.72) {
          const isMoving = Math.random() < Math.min(0.55, 0.2 + this.distance * 0.0003);
          const withRamp = !isMoving && Math.random() < 0.55;
          const paletteIndex = Math.floor(Math.random() * TRAIN_PALETTES.length);
          this.spawnTrain(lane, z, paletteIndex, isMoving, withRamp);
          if (withRamp) {
            this.spawnTokenLine(lane, TRAIN_HEIGHT + 0.85, z + 5, z - 6, 4);
          }
        }
      }
    } else if (roll < 0.66) {
      const lanes: LaneIndex[] = [-1, 0, 1];
      const safeCount = Math.random() < 0.4 ? 1 : 2;
      const picked = [...lanes].sort(() => Math.random() - 0.5);
      for (let idx = 0; idx < 3; idx++) {
        const lane = picked[idx];
        if (idx < safeCount) {
          this.spawnTokenLine(lane, 0.9, z + 4, z - 6, 4);
        } else {
          const kindRoll = Math.random();
          const kind: StaticBarrierKind =
            kindRoll < 0.38
              ? 'barrier'
              : kindRoll < 0.72
              ? 'overhead'
              : 'roadblock';
          this.spawnBarrier(lane, z, kind);
          if (kind === 'barrier' || kind === 'roadblock') {
            this.spawnTokenArc(lane, z);
          } else {
            this.spawnTokenLine(lane, 0.55, z + 3, z - 3, 3);
          }
        }
      }
    } else if (roll < 0.88) {
      const lanes = ([-1, 0, 1] as LaneIndex[]).sort(() => Math.random() - 0.5);
      const paletteIndex = Math.floor(Math.random() * TRAIN_PALETTES.length);
      this.spawnTrain(lanes[0], z - 4, paletteIndex, true, false);
      this.spawnBarrier(lanes[1], z + 2, 'construction');
      this.spawnTokenLine(lanes[2], 0.9, z + 6, z - 8, 5);
    } else {
      const lane = (Math.floor(Math.random() * 3) - 1) as LaneIndex;
      this.spawnTokenLine(lane, 0.9, z + 6, z - 6, 5);
      this.spawnBarrier(lane === 0 ? 1 : 0, z, 'overhead');
    }

    this.trySpawnPowerUpForWave(z - 12);
  }

  private trySpawnPowerUpForWave(spawnZ: number): void {
    // Keep clean spacing so power-ups feel rewarding and never cluster together
    if (this.lastPowerUpSpawnZ - spawnZ < 58) return;
    if (Math.random() > 0.58) return;

    const types: CollectiblePowerUpType[] = [
      'fhe',
      'zero_mev',
      'encrypted_intents',
      'confidential_settlement',
    ];
    const pool = this.lastPowerUpType
      ? types.filter((t) => t !== this.lastPowerUpType)
      : types;
    const pType = pool[Math.floor(Math.random() * pool.length)];

    const lanes = ([-1, 0, 1] as LaneIndex[]).sort(() => Math.random() - 0.5);
    for (const lane of lanes) {
      const y = this.getPowerUpSafeY(lane, spawnZ);
      if (y !== null) {
        this.spawnPowerUp(pType, lane, y, spawnZ);
        this.lastPowerUpSpawnZ = spawnZ;
        this.lastPowerUpType = pType;
        break;
      }
    }
  }

  private getPowerUpSafeY(lane: LaneIndex, z: number): number | null {
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.lane !== lane) continue;
      const halfL = obs.length * 0.5 + 2.4;
      if (Math.abs(z - obs.z) <= halfL) {
        if (obs.kind === 'train_static' && obs.withRamp && Math.abs(z - obs.z) <= obs.length * 0.4) {
          return TRAIN_HEIGHT + 1.05;
        }
        return null;
      }
    }
    return 1.05;
  }

  private acquireTrainSlot(paletteIndex: number, withRamp: boolean): PooledTrainSlot {
    for (let i = 0; i < this.trainPool.length; i++) {
      const slot = this.trainPool[i];
      if (!slot.inUse && slot.paletteIndex === paletteIndex && slot.withRamp === withRamp) {
        slot.inUse = true;
        return slot;
      }
    }
    for (let i = 0; i < this.trainPool.length; i++) {
      const slot = this.trainPool[i];
      if (!slot.inUse && slot.withRamp === withRamp) {
        slot.inUse = true;
        return slot;
      }
    }
    // Pool exhausted fallback: grow pool cleanly using shared assets
    const built = createFuturisticTrain(this.assets, paletteIndex, true, withRamp);
    built.group.visible = false;
    this.scene.add(built.group);
    const created: PooledTrainSlot = {
      paletteIndex,
      withRamp,
      inUse: true,
      mesh: built.group,
    };
    this.trainPool.push(created);
    return created;
  }

  private acquireBarrierSlot(kind: StaticBarrierKind): PooledBarrierSlot {
    for (let i = 0; i < this.barrierPool.length; i++) {
      const slot = this.barrierPool[i];
      if (!slot.inUse && slot.kind === kind) {
        slot.inUse = true;
        return slot;
      }
    }
    const mesh = createObstacleMesh(kind, this.assets);
    mesh.visible = false;
    this.scene.add(mesh);
    const created: PooledBarrierSlot = { kind, inUse: true, mesh };
    this.barrierPool.push(created);
    return created;
  }

  private acquireTokenSlot(): PooledTokenSlot {
    for (let i = 0; i < this.tokenPool.length; i++) {
      const slot = this.tokenPool[i];
      if (!slot.inUse) {
        slot.inUse = true;
        return slot;
      }
    }
    const mesh = createFlutonTokenMesh(this.assets);
    mesh.visible = false;
    this.scene.add(mesh);
    const created: PooledTokenSlot = { inUse: true, mesh };
    this.tokenPool.push(created);
    return created;
  }

  private acquirePowerUpSlot(type: PowerUpType): PooledPowerUpSlot {
    for (let i = 0; i < this.powerUpPool.length; i++) {
      const slot = this.powerUpPool[i];
      if (!slot.inUse && slot.type === type) {
        slot.inUse = true;
        return slot;
      }
    }
    const mesh = createPowerUpMesh(type, this.assets);
    mesh.visible = false;
    this.scene.add(mesh);
    const created: PooledPowerUpSlot = { type, inUse: true, mesh };
    this.powerUpPool.push(created);
    return created;
  }

  private spawnTrain(
    lane: LaneIndex,
    z: number,
    paletteIndex: number,
    isMoving: boolean,
    withRamp: boolean
  ): void {
    const slot = this.acquireTrainSlot(paletteIndex, withRamp);
    slot.mesh.position.set(LANE_X[lane + 1], 0, z);
    slot.mesh.visible = true;

    this.obstacles.push({
      id: this.nextObstacleId++,
      kind: isMoving ? 'train_moving' : 'train_static',
      lane,
      z,
      length: TRAIN_LEN,
      width: 2.38,
      height: TRAIN_HEIGHT,
      clearanceY: 0,
      withRamp,
      speed: isMoving ? 10 + Math.random() * 6 : 0,
      honked: false,
      mesh: slot.mesh,
      trainPoolSlot: slot,
    });
  }

  private spawnBarrier(lane: LaneIndex, z: number, kind: StaticBarrierKind): void {
    const slot = this.acquireBarrierSlot(kind);
    slot.mesh.position.set(LANE_X[lane + 1], 0, z);
    slot.mesh.visible = true;

    this.obstacles.push({
      id: this.nextObstacleId++,
      kind,
      lane,
      z,
      length: kind === 'construction' ? 0.9 : 0.55,
      width: 2.15,
      height: kind === 'overhead' ? 2.65 : kind === 'construction' ? 2.7 : 1.02,
      clearanceY: kind === 'overhead' ? 1.18 : 0,
      withRamp: false,
      speed: 0,
      honked: true,
      mesh: slot.mesh,
      barrierPoolSlot: slot,
    });
  }

  private spawnTokenLine(
    lane: LaneIndex,
    y: number,
    zStart: number,
    zEnd: number,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const z = THREE.MathUtils.lerp(zStart, zEnd, t);
      this.spawnSingleToken(lane, y, z);
    }
  }

  private spawnTokenArc(lane: LaneIndex, zCenter: number): void {
    for (let i = -2; i <= 2; i++) {
      const z = zCenter - i * 1.45;
      const y = 0.95 + Math.cos((i / 2.2) * (Math.PI / 2)) * 1.55;
      this.spawnSingleToken(lane, y, z);
    }
  }

  private spawnSingleToken(lane: LaneIndex, y: number, z: number): void {
    const slot = this.acquireTokenSlot();
    const x = LANE_X[lane + 1];
    slot.mesh.position.set(x, y, z);
    slot.mesh.rotation.y = 0;
    slot.mesh.visible = true;

    this.tokens.push({
      lane,
      x,
      y,
      z,
      collected: false,
      magnetized: false,
      slot,
      mesh: slot.mesh,
    });
  }

  private spawnPowerUp(
    type: CollectiblePowerUpType,
    lane: LaneIndex,
    y: number,
    z: number
  ): void {
    const slot = this.acquirePowerUpSlot(type);
    slot.mesh.position.set(LANE_X[lane + 1], y, z);
    slot.mesh.scale.setScalar(1);
    const spinObj = slot.mesh.userData.spinGroup as THREE.Object3D | undefined;
    if (spinObj) spinObj.rotation.set(0, 0, 0);
    slot.mesh.visible = true;
    this.powerUps.push({
      type,
      lane,
      y,
      z,
      collected: false,
      collectAnim: 0,
      slot,
      mesh: slot.mesh,
    });
  }

  private spawnParticles(
    x: number,
    y: number,
    z: number,
    colorHex: number,
    count: number,
    speed: number
  ): void {
    const cap = this.maxParticlesAllowed;
    const clampedCount = this.quality === 'low' ? Math.max(1, Math.ceil(count * 0.5)) : count;
    for (let i = 0; i < clampedCount; i++) {
      const idx = this.particleWriteCursor % cap;
      this.particleWriteCursor++;
      const p = this.particleStates[idx];
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = (Math.random() - 0.5) * speed * 1.4;
      p.vy = Math.random() * speed + 1.2;
      p.vz = (Math.random() - 0.5) * speed * 1.4;
      p.maxLife = 0.45 + Math.random() * 0.22;
      p.life = p.maxLife;
      p.colorHex = colorHex;
    }
  }

  private updateParticles(dt: number): void {
    let instanceIndex = 0;
    const cap = this.maxParticlesAllowed;
    for (let i = 0; i < cap; i++) {
      const p = this.particleStates[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy -= 9.8 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      const s = Math.max(0.05, p.life / p.maxLife);
      _vec3.set(p.x, p.y, p.z);
      _scaleVec.setScalar(s);
      _mat4.compose(_vec3, _quat, _scaleVec);
      this.particleInstanced.setMatrixAt(instanceIndex, _mat4);
      _color.setHex(p.colorHex);
      this.particleInstanced.setColorAt(instanceIndex, _color);
      instanceIndex++;
    }

    this.particleInstanced.count = instanceIndex;
    if (instanceIndex > 0) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
      if (this.particleInstanced.instanceColor) {
        this.particleInstanced.instanceColor.needsUpdate = true;
      }
    }
  }

  private animateRunCycle(dt: number, playAudio: boolean, onTrain = false): void {
    this.runCycle += dt * (this.zeroMevTimer > 0 ? 18 : 13.5);
    const s = Math.sin(this.runCycle);
    const c = Math.cos(this.runCycle);

    this.playerRig.bodyPivot.position.y = Math.abs(c) * 0.09;
    this.playerRig.bodyPivot.rotation.set(0.14, 0, 0);
    this.playerRig.torso.rotation.y = s * 0.1;
    this.playerRig.head.rotation.x = -0.1;

    this.playerRig.leftLeg.rotation.x = s * 0.95;
    this.playerRig.rightLeg.rotation.x = -s * 0.95;
    this.playerRig.leftArm.rotation.x = -s * 0.88;
    this.playerRig.rightArm.rotation.x = s * 0.88;
    this.playerRig.leftArm.rotation.z = 0.14;
    this.playerRig.rightArm.rotation.z = -0.14;

    this.animateTail(this.runCycle);

    if (playAudio && this.isGrounded && this.phase === 'playing') {
      const stepPhase = Math.floor(this.runCycle / Math.PI);
      if (stepPhase !== this.lastFootstepPhase) {
        this.lastFootstepPhase = stepPhase;
        audioEngine.playFootstep(onTrain);
      }
    }
  }

  private animateJumpPose(): void {
    this.playerRig.bodyPivot.position.y = 0;
    this.playerRig.bodyPivot.rotation.set(
      this.rollSpin > 0 ? -this.rollSpin * Math.PI * 2 : -0.12,
      0,
      0
    );
    this.playerRig.leftLeg.rotation.x = 0.65;
    this.playerRig.rightLeg.rotation.x = -0.45;
    this.playerRig.leftArm.rotation.x = -1.1;
    this.playerRig.rightArm.rotation.x = -0.75;
    this.animateTail(this.elapsed * 8);
  }

  private animateSlidePose(): void {
    this.playerRig.bodyPivot.position.y = -0.46;
    this.playerRig.bodyPivot.rotation.set(-0.92, 0, 0);
    this.playerRig.leftLeg.rotation.x = -0.45;
    this.playerRig.rightLeg.rotation.x = -0.25;
    this.playerRig.leftArm.rotation.x = 0.7;
    this.playerRig.rightArm.rotation.x = 0.7;
    this.animateTail(this.elapsed * 7);
  }

  private animateHoverboardPose(dt: number): void {
    const sway = Math.sin(this.elapsed * 5) * 0.08;
    this.playerRig.bodyPivot.position.y = 0;
    this.playerRig.bodyPivot.rotation.set(0.06, -0.48, sway);
    this.playerRig.leftLeg.rotation.x = -0.22;
    this.playerRig.rightLeg.rotation.x = 0.25;
    this.playerRig.leftArm.rotation.z = 0.62 + sway;
    this.playerRig.rightArm.rotation.z = -0.62 + sway;
    this.playerRig.leftArm.rotation.x = 0;
    this.playerRig.rightArm.rotation.x = 0;
    this.animateTail(this.elapsed * 6 + dt);
  }

  private animateTail(phase: number): void {
    for (let i = 0; i < this.playerRig.tailSegments.length; i++) {
      const seg = this.playerRig.tailSegments[i];
      seg.rotation.y = Math.sin(phase - i * 0.55) * (0.22 + i * 0.05);
      seg.rotation.x = 0.22 + Math.cos(phase * 0.7 - i * 0.4) * 0.1;
    }
  }

  private animateChasers(dt: number, jumpH: number, running: boolean): void {
    const spd = running ? 14 : 0;
    const t = this.elapsed * spd;
    const s = Math.sin(t);

    if (running) {
      this.officerRig.bodyPivot.position.y = Math.abs(Math.cos(t)) * 0.08;
      this.officerRig.bodyPivot.rotation.x = 0.16;
      this.officerRig.leftLeg.rotation.x = s * 0.9;
      this.officerRig.rightLeg.rotation.x = -s * 0.9;
      this.officerRig.leftArm.rotation.x = -s * 0.85;
      this.officerRig.rightArm.rotation.x = s * 0.85;

      const d1 = Math.sin(t * 1.15);
      const d2 = Math.sin(t * 1.15 + 0.55);
      this.dogRig.bodyPivot.position.y = Math.abs(Math.cos(t * 1.15)) * 0.1 + jumpH * 0.02;
      this.dogRig.legFL.rotation.x = d1 * 0.85;
      this.dogRig.legFR.rotation.x = d2 * 0.85;
      this.dogRig.legBL.rotation.x = -d1 * 0.85;
      this.dogRig.legBR.rotation.x = -d2 * 0.85;
      this.dogRig.tail.rotation.y = Math.sin(this.elapsed * 16) * 0.45;
      this.dogRig.jaw.rotation.x = Math.max(0, Math.sin(this.elapsed * 9) * 0.35);
    } else {
      this.officerRig.bodyPivot.position.y = 0;
      this.officerRig.bodyPivot.rotation.x = 0;
      this.officerRig.leftLeg.rotation.x = 0;
      this.officerRig.rightLeg.rotation.x = 0;
      this.officerRig.leftArm.rotation.x = -0.8;
      this.officerRig.rightArm.rotation.x = -1.1;
      this.dogRig.jaw.rotation.x = Math.max(0, Math.sin(this.elapsed * 14) * 0.42);
      this.dogRig.tail.rotation.y = Math.sin(this.elapsed * 14) * 0.4 + dt * 0;
    }
  }

  private getIntroCaption(): IntroCaptionState {
    if (this.phase !== 'intro') {
      return { visible: false, speaker: '', text: '', sceneIndex: 0 };
    }
    const t = this.introTime;
    if (t < 1.6) {
      return {
        visible: true,
        speaker: 'FLUTON',
        text: 'Entering Fluton Metro Station… time to leave a signature.',
        sceneIndex: 1,
      };
    }
    if (t < 3.4) {
      return {
        visible: true,
        speaker: 'FLUTON',
        text: 'Spraying "gFluton" across the Express!',
        sceneIndex: 2,
      };
    }
    if (t < 5.6) {
      return {
        visible: true,
        speaker: 'TRANSIT SECURITY',
        text: 'HEY! STOP THAT CAT! *WHISTLE* *BARK!*',
        sceneIndex: 3,
      };
    }
    return {
      visible: true,
      speaker: 'CHASE STARTED',
      text: 'Hit the tracks and outrun security!',
      sceneIndex: 5,
    };
  }

  private emitHud(force: boolean): void {
    this.lastHudEmit = this.elapsed;
    const activePowerUps: ActivePowerUpHUD[] = [];
    if (this.hasShield && this.fheTimer > 0) {
      activePowerUps.push({
        type: 'fhe',
        label: 'FHE',
        subtitle: 'Encryption Shield',
        remaining: this.fheTimer,
        duration: 10,
      });
    }
    if (this.zeroMevTimer > 0) {
      activePowerUps.push({
        type: 'zero_mev',
        label: 'ZERO MEV',
        subtitle: 'Speed Boost',
        remaining: this.zeroMevTimer,
        duration: 6,
      });
    }
    if (this.stealthTimer > 0) {
      activePowerUps.push({
        type: 'encrypted_intents',
        label: 'ENCRYPTED INTENTS',
        subtitle: 'Stealth Phase',
        remaining: this.stealthTimer,
        duration: 8,
      });
    }
    if (this.settlementTimer > 0) {
      activePowerUps.push({
        type: 'confidential_settlement',
        label: 'CONFIDENTIAL SETTLEMENT',
        subtitle: 'Coin Magnet',
        remaining: this.settlementTimer,
        duration: 10,
      });
    }
    if (this.hoverboardTimer > 0) {
      activePowerUps.push({
        type: 'hoverboard',
        label: 'Hoverboard',
        remaining: this.hoverboardTimer,
        duration: 10,
      });
    }

    if (!force && this.phase === 'menu') return;

    this.onHudUpdate({
      phase: this.phase,
      score: Math.floor(this.score),
      bestScore: Math.max(this.bestScore, Math.floor(this.score)),
      runTokens: this.runTokens,
      totalTokens: this.totalTokens,
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.currentSpeed * 3.6),
      multiplier: 1,
      hasShield: this.hasShield,
      stealthActive: this.stealthTimer > 0,
      hoverboardActive: this.hoverboardTimer > 0,
      hoverboardCharge: Math.round(this.hoverboardCharge),
      activePowerUps,
      pickupBanner: this.pickupBanner,
      introCaption: this.getIntroCaption(),
      isNewBest: this.score > 0 && Math.floor(this.score) > this.bestScore,
      chaseProximity: THREE.MathUtils.clamp((6.0 - this.chaseDist) / 3.5, 0, 1),
      bannerMessage: this.bannerMessage,
    });
  }

  public dispose(): void {
    this.disposed = true;
    this.stopLoop();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    const el = this.renderer.domElement;
    el.removeEventListener('touchstart', this.handleTouchStart);
    el.removeEventListener('touchend', this.handleTouchEnd);
    el.removeEventListener('webglcontextlost', this.handleContextLost);
    audioEngine.stopMusic();
    audioEngine.stopBannerVoice();

    this.assets.dispose();
    this.skyTex?.dispose();
    this.shadowTex?.dispose();
    this.envRT?.dispose();
    for (const g of this.extraGeos) g.dispose();
    for (const m of this.extraMats) m.dispose();
    for (const t of this.extraTexs) t.dispose();

    this.renderer.dispose();
    if (el.parentNode) el.parentNode.removeChild(el);
  }
}
