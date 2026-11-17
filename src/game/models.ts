import * as THREE from 'three';
import {
  CharacterSkinDef,
  CollectiblePowerUpType,
  GraphicsQuality,
  HoverboardSkinDef,
  PowerUpType,
} from '../types/game';
import {
  createEncryptionGlyphTexture,
  createFlutonTokenTexture,
  createForeheadLogoTexture,
  createHazardStripeTexture,
  createPowerUpLabelTexture,
  createTrainSideTexture,
} from './textures';

export interface FlutonCatRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  tailSegments: THREE.Group[];
  sprayCan: THREE.Group;
  shieldShell: THREE.Mesh;
  speedRing: THREE.Mesh;
  magnetRing: THREE.Mesh;
  furMat: THREE.MeshStandardMaterial;
  suitMat: THREE.MeshStandardMaterial;
  shirtMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  glowMat: THREE.MeshBasicMaterial;
}

export interface OfficerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

export interface DogRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  head: THREE.Group;
  jaw: THREE.Mesh;
  legFL: THREE.Group;
  legFR: THREE.Group;
  legBL: THREE.Group;
  legBR: THREE.Group;
  tail: THREE.Group;
}

export interface HoverboardRig {
  root: THREE.Group;
  deckMat: THREE.MeshStandardMaterial;
  railMat: THREE.MeshStandardMaterial;
  thrusterLeft: THREE.Mesh;
  thrusterRight: THREE.Mesh;
}

export interface TrainPaletteDef {
  bodyHex: string;
  stripeHex: string;
}

export const TRAIN_PALETTES: TrainPaletteDef[] = [
  { bodyHex: '#27243b', stripeHex: '#a855f7' },
  { bodyHex: '#f1f5f9', stripeHex: '#9333ea' },
  { bodyHex: '#1e293b', stripeHex: '#38bdf8' },
  { bodyHex: '#3b0764', stripeHex: '#f472b6' },
];

/**
 * Shared geometry/texture/material registry so pooled objects incur ZERO per-spawn allocations
 * and clean up deterministically on engine dispose.
 */
export class SharedAssetRegistry {
  public readonly textures: THREE.Texture[] = [];
  public readonly materials: THREE.Material[] = [];
  public readonly geometries: THREE.BufferGeometry[] = [];

  public readonly tokenTex: THREE.CanvasTexture;
  public readonly foreheadTex: THREE.CanvasTexture;
  public readonly hazardTex: THREE.CanvasTexture;

  // Token shared assets
  public readonly tokenBodyGeo: THREE.CylinderGeometry;
  public readonly tokenRingGeo: THREE.TorusGeometry;
  public readonly tokenRimMat: THREE.MeshStandardMaterial;
  public readonly tokenFaceMat: THREE.MeshStandardMaterial;
  public readonly tokenGlowMat: THREE.MeshBasicMaterial;

  // Obstacle shared assets
  public readonly hazardMat: THREE.MeshStandardMaterial;
  public readonly metalMat: THREE.MeshStandardMaterial;
  public readonly glowPurpleMat: THREE.MeshBasicMaterial;
  public readonly concreteMat: THREE.MeshStandardMaterial;
  public readonly coneMat: THREE.MeshStandardMaterial;
  public readonly redBeaconMat: THREE.MeshBasicMaterial;

  // Obstacle shared geometries
  public readonly barrierPostGeo: THREE.CylinderGeometry;
  public readonly barrierCapGeo: THREE.SphereGeometry;
  public readonly barrierPlankGeo: THREE.BoxGeometry;
  public readonly overheadPillarGeo: THREE.BoxGeometry;
  public readonly overheadHeaderGeo: THREE.BoxGeometry;
  public readonly overheadBarGeo: THREE.BoxGeometry;
  public readonly roadBlockGeo: THREE.BoxGeometry;
  public readonly roadTopGeo: THREE.BoxGeometry;
  public readonly roadConeGeo: THREE.ConeGeometry;
  public readonly towerBaseGeo: THREE.BoxGeometry;
  public readonly towerFrameGeo: THREE.BoxGeometry;
  public readonly towerBeaconGeo: THREE.SphereGeometry;

  // Train shared geometries & materials
  public readonly trainBodyGeo: THREE.BoxGeometry;
  public readonly trainCabGeo: THREE.BoxGeometry;
  public readonly trainGlassGeo: THREE.BoxGeometry;
  public readonly trainHeadlightGeo: THREE.CylinderGeometry;
  public readonly trainDestBarGeo: THREE.BoxGeometry;
  public readonly trainNeonStripGeo: THREE.BoxGeometry;
  public readonly trainAcGeo: THREE.BoxGeometry;
  public readonly trainPantoGeo: THREE.BoxGeometry;
  public readonly trainWheelGeo: THREE.CylinderGeometry;
  public readonly trainRampGeo: THREE.BoxGeometry;
  public readonly trainRampGuideGeo: THREE.BoxGeometry;

  public readonly trainRoofMat: THREE.MeshStandardMaterial;
  public readonly trainUndercarriageMat: THREE.MeshStandardMaterial;
  public readonly trainGlassMat: THREE.MeshStandardMaterial;
  public readonly trainHeadlightFrontMat: THREE.MeshBasicMaterial;
  public readonly trainHeadlightRearMat: THREE.MeshBasicMaterial;
  public readonly trainDestLedMat: THREE.MeshBasicMaterial;
  public readonly trainAcMat: THREE.MeshStandardMaterial;
  public readonly trainWheelMat: THREE.MeshStandardMaterial;
  public readonly trainRampMat: THREE.MeshStandardMaterial;
  public readonly trainGuideMat: THREE.MeshBasicMaterial;

  public readonly trainSideCleanTexs: THREE.CanvasTexture[] = [];
  public readonly trainSideGraffitiTexs: THREE.CanvasTexture[] = [];
  public readonly trainSideCleanMats: THREE.MeshStandardMaterial[] = [];
  public readonly trainSideGraffitiMats: THREE.MeshStandardMaterial[] = [];
  public readonly trainFrontMats: THREE.MeshStandardMaterial[] = [];
  public readonly trainNeonStripMats: THREE.MeshBasicMaterial[] = [];

  // PowerUp shared assets
  public readonly puAuraGeo: THREE.TorusGeometry;
  public readonly puLabelGeo: THREE.PlaneGeometry;
  public readonly puAuraMat: THREE.MeshBasicMaterial;
  public readonly puCoreMat: THREE.MeshStandardMaterial;
  public readonly puSilverMat: THREE.MeshStandardMaterial;
  public readonly puDarkHullMat: THREE.MeshStandardMaterial;
  public readonly puCipherMat: THREE.MeshStandardMaterial;
  public readonly puHoloMat: THREE.MeshStandardMaterial;
  public readonly puLightningMat: THREE.MeshStandardMaterial;
  public readonly puBadgeMat: THREE.MeshBasicMaterial;
  public readonly puLabelMats: Record<CollectiblePowerUpType, THREE.MeshBasicMaterial>;

  // Palm tree shared assets
  public readonly palmTrunkGeo: THREE.CylinderGeometry;
  public readonly palmFrondGeo: THREE.ConeGeometry;
  public readonly palmTrunkMat: THREE.MeshStandardMaterial;
  public readonly palmLeafMat: THREE.MeshStandardMaterial;

  constructor(maxAnisotropy: number, quality: GraphicsQuality) {
    const texScale = quality === 'low' ? 0.5 : 1;
    const tokenSize = quality === 'low' ? 192 : 256;
    const trainWidth = quality === 'low' ? 512 : quality === 'medium' ? 768 : 1024;

    this.tokenTex = this.regTex(createFlutonTokenTexture(maxAnisotropy, tokenSize));
    this.foreheadTex = this.regTex(createForeheadLogoTexture(maxAnisotropy));
    this.hazardTex = this.regTex(createHazardStripeTexture(maxAnisotropy));

    // Tokens — rotate cylinder into XY plane and map upright planar UVs on both +Z and -Z faces
    const tokenRadius = 0.42;
    const tokenCyl = new THREE.CylinderGeometry(
      tokenRadius,
      tokenRadius,
      0.09,
      quality === 'low' ? 18 : 24
    );
    tokenCyl.rotateX(Math.PI / 2);
    const tPos = tokenCyl.attributes.position;
    const tUv = tokenCyl.attributes.uv;
    const tIdx = tokenCyl.index;
    if (tIdx) {
      const frontCapGroup = tokenCyl.groups[1];
      if (frontCapGroup) {
        for (let i = frontCapGroup.start; i < frontCapGroup.start + frontCapGroup.count; i++) {
          const vi = tIdx.getX(i);
          const vx = tPos.getX(vi);
          const vy = tPos.getY(vi);
          tUv.setXY(vi, 0.5 + vx / (2 * tokenRadius), 0.5 + vy / (2 * tokenRadius));
        }
      }
      const backCapGroup = tokenCyl.groups[2];
      if (backCapGroup) {
        for (let i = backCapGroup.start; i < backCapGroup.start + backCapGroup.count; i++) {
          const vi = tIdx.getX(i);
          const vx = tPos.getX(vi);
          const vy = tPos.getY(vi);
          tUv.setXY(vi, 0.5 - vx / (2 * tokenRadius), 0.5 + vy / (2 * tokenRadius));
        }
      }
      tUv.needsUpdate = true;
    }
    this.tokenBodyGeo = this.regGeo(tokenCyl);
    this.tokenRingGeo = this.regGeo(new THREE.TorusGeometry(0.45, 0.032, 8, quality === 'low' ? 18 : 24));
    this.tokenRimMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.85,
        metalness: 0.85,
        roughness: 0.18,
      })
    );
    this.tokenFaceMat = this.regMat(
      new THREE.MeshStandardMaterial({
        map: this.tokenTex,
        roughness: 0.25,
        metalness: 0.35,
        emissive: 0x3b0764,
        emissiveIntensity: 0.25,
      })
    );
    this.tokenGlowMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xc084fc }));

    // Obstacles
    this.hazardMat = this.regMat(
      new THREE.MeshStandardMaterial({
        map: this.hazardTex,
        roughness: 0.45,
        metalness: 0.15,
      })
    );
    this.metalMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.4,
        metalness: 0.75,
      })
    );
    this.glowPurpleMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
    this.concreteMat = this.regMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 }));
    this.coneMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0x7c2d12,
        emissiveIntensity: 0.22,
        roughness: 0.4,
      })
    );
    this.redBeaconMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

    this.barrierPostGeo = this.regGeo(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 8));
    this.barrierCapGeo = this.regGeo(new THREE.SphereGeometry(0.1, 8, 8));
    this.barrierPlankGeo = this.regGeo(new THREE.BoxGeometry(2.35, 0.42, 0.18));
    this.overheadPillarGeo = this.regGeo(new THREE.BoxGeometry(0.18, 2.75, 0.22));
    this.overheadHeaderGeo = this.regGeo(new THREE.BoxGeometry(2.62, 0.92, 0.34));
    this.overheadBarGeo = this.regGeo(new THREE.BoxGeometry(2.2, 0.12, 0.38));
    this.roadBlockGeo = this.regGeo(new THREE.BoxGeometry(2.2, 0.65, 0.52));
    this.roadTopGeo = this.regGeo(new THREE.BoxGeometry(2.22, 0.22, 0.54));
    this.roadConeGeo = this.regGeo(new THREE.ConeGeometry(0.18, 0.55, 8));
    this.towerBaseGeo = this.regGeo(new THREE.BoxGeometry(1.9, 0.5, 0.9));
    this.towerFrameGeo = this.regGeo(new THREE.BoxGeometry(1.6, 2.2, 0.4));
    this.towerBeaconGeo = this.regGeo(new THREE.SphereGeometry(0.2, 10, 10));

    // Trains
    const len = 16.5;
    const width = 2.48;
    const height = 3.25;

    this.trainBodyGeo = this.regGeo(new THREE.BoxGeometry(width, height - 0.35, len - 1.6));
    this.trainCabGeo = this.regGeo(new THREE.BoxGeometry(width - 0.04, height - 0.5, 1.15));
    this.trainGlassGeo = this.regGeo(new THREE.BoxGeometry(width - 0.42, 0.88, 0.12));
    this.trainHeadlightGeo = this.regGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 10));
    this.trainDestBarGeo = this.regGeo(new THREE.BoxGeometry(1.32, 0.14, 0.1));
    this.trainNeonStripGeo = this.regGeo(new THREE.BoxGeometry(0.06, 0.08, len - 1.8));
    this.trainAcGeo = this.regGeo(new THREE.BoxGeometry(1.4, 0.24, 2.2));
    this.trainPantoGeo = this.regGeo(new THREE.BoxGeometry(1.15, 0.12, 1.6));
    this.trainWheelGeo = this.regGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10));
    this.trainRampGeo = this.regGeo(new THREE.BoxGeometry(width - 0.2, 0.24, 4.6));
    this.trainRampGuideGeo = this.regGeo(new THREE.BoxGeometry(0.08, 0.08, 4.6));

    this.trainRoofMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x1e1b2e, roughness: 0.55, metalness: 0.4 })
    );
    this.trainUndercarriageMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x0f1018, roughness: 0.8, metalness: 0.3 })
    );
    this.trainGlassMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x0b1120, roughness: 0.1, metalness: 0.9 })
    );
    this.trainHeadlightFrontMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    this.trainHeadlightRearMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    this.trainDestLedMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xc084fc }));
    this.trainAcMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.5 })
    );
    this.trainWheelMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.25 })
    );
    this.trainRampMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.4, metalness: 0.4 })
    );
    this.trainGuideMat = this.regMat(new THREE.MeshBasicMaterial({ color: 0xc084fc }));

    for (let i = 0; i < TRAIN_PALETTES.length; i++) {
      const p = TRAIN_PALETTES[i];
      const cleanTex = this.regTex(
        createTrainSideTexture(maxAnisotropy, p.bodyHex, p.stripeHex, false, i, trainWidth)
      );
      const grafTex = this.regTex(
        createTrainSideTexture(maxAnisotropy, p.bodyHex, p.stripeHex, true, i, trainWidth)
      );
      this.trainSideCleanTexs.push(cleanTex);
      this.trainSideGraffitiTexs.push(grafTex);

      this.trainSideCleanMats.push(
        this.regMat(
          new THREE.MeshStandardMaterial({
            map: cleanTex,
            roughness: 0.32,
            metalness: 0.45,
          })
        )
      );
      this.trainSideGraffitiMats.push(
        this.regMat(
          new THREE.MeshStandardMaterial({
            map: grafTex,
            roughness: 0.32,
            metalness: 0.45,
          })
        )
      );
      this.trainFrontMats.push(
        this.regMat(
          new THREE.MeshStandardMaterial({
            color: p.bodyHex,
            roughness: 0.28,
            metalness: 0.55,
          })
        )
      );
      this.trainNeonStripMats.push(
        this.regMat(new THREE.MeshBasicMaterial({ color: p.stripeHex }))
      );
    }

    // PowerUps (FHE, ZERO MEV, ENCRYPTED INTENTS, CONFIDENTIAL SETTLEMENT)
    const cipherTex = this.regTex(createEncryptionGlyphTexture(maxAnisotropy));
    this.puAuraGeo = this.regGeo(new THREE.TorusGeometry(0.56, 0.032, 8, 24));
    this.puLabelGeo = this.regGeo(new THREE.PlaneGeometry(1.85, 0.56));
    this.puAuraMat = this.regMat(
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.88 })
    );
    this.puCoreMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x9333ea,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.72,
        metalness: 0.75,
        roughness: 0.2,
      })
    );
    this.puSilverMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.9, roughness: 0.15 })
    );
    this.puDarkHullMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x090812,
        metalness: 0.75,
        roughness: 0.28,
      })
    );
    this.puCipherMat = this.regMat(
      new THREE.MeshStandardMaterial({
        map: cipherTex,
        emissive: 0x9333ea,
        emissiveMap: cipherTex,
        emissiveIntensity: 0.95,
        roughness: 0.25,
        metalness: 0.4,
      })
    );
    this.puHoloMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 1.05,
        transparent: true,
        opacity: 0.56,
        roughness: 0.15,
        metalness: 0.25,
      })
    );
    this.puLightningMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0xf3e8ff,
        emissive: 0xa855f7,
        emissiveIntensity: 1.45,
        roughness: 0.18,
        metalness: 0.55,
      })
    );
    this.puBadgeMat = this.regMat(
      new THREE.MeshBasicMaterial({ map: this.tokenTex, side: THREE.DoubleSide })
    );
    this.puLabelMats = {
      fhe: this.regMat(
        new THREE.MeshBasicMaterial({
          map: this.regTex(createPowerUpLabelTexture(maxAnisotropy, 'FHE', 'ENERGY SHIELD · +10')),
          transparent: true,
          depthWrite: false,
        })
      ),
      zero_mev: this.regMat(
        new THREE.MeshBasicMaterial({
          map: this.regTex(createPowerUpLabelTexture(maxAnisotropy, 'ZERO MEV', 'LIGHTNING BOOST · +10')),
          transparent: true,
          depthWrite: false,
        })
      ),
      encrypted_intents: this.regMat(
        new THREE.MeshBasicMaterial({
          map: this.regTex(createPowerUpLabelTexture(maxAnisotropy, 'ENCRYPTED INTENTS', 'STEALTH CLOAK · +10')),
          transparent: true,
          depthWrite: false,
        })
      ),
      confidential_settlement: this.regMat(
        new THREE.MeshBasicMaterial({
          map: this.regTex(createPowerUpLabelTexture(maxAnisotropy, 'CONFIDENTIAL SETTLEMENT', 'TOKEN MAGNET · +10')),
          transparent: true,
          depthWrite: false,
        })
      ),
    };

    // Palm Trees
    this.palmTrunkGeo = this.regGeo(new THREE.CylinderGeometry(0.14, 0.26, 4.2, 7));
    this.palmFrondGeo = this.regGeo(new THREE.ConeGeometry(0.45, 2.3, 4));
    this.palmTrunkMat = this.regMat(
      new THREE.MeshStandardMaterial({ color: 0x78553a, roughness: 0.85 })
    );
    this.palmLeafMat = this.regMat(
      new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.6,
        side: THREE.DoubleSide,
      })
    );
    void texScale;
  }

  public regTex<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  public regMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  public regGeo<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  public setAnisotropy(aniso: number): void {
    for (const tex of this.textures) {
      tex.anisotropy = aniso;
      tex.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const t of this.textures) t.dispose();
    for (const m of this.materials) m.dispose();
    for (const g of this.geometries) g.dispose();
  }
}

function addOutlineHull(
  mesh: THREE.Mesh,
  outlineMat: THREE.Material,
  scale = 1.07
): void {
  const hull = new THREE.Mesh(mesh.geometry, outlineMat);
  hull.scale.setScalar(scale);
  hull.castShadow = false;
  hull.receiveShadow = false;
  mesh.add(hull);
}

/**
 * Builds the official Fluton Black Tuxedo Cat Mascot (Reference Image 1).
 * Faces -Z in local coordinates (so running down -Z faces away from camera).
 */
export function createFlutonCat(
  skin: CharacterSkinDef,
  assets: SharedAssetRegistry
): FlutonCatRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const furMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0x101015,
      roughness: 0.65,
      metalness: 0.08,
    })
  );

  const suitMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: skin.suitColor,
      roughness: 0.42,
      metalness: 0.22,
    })
  );

  const shirtMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: skin.shirtColor,
      roughness: 0.35,
      metalness: 0.05,
    })
  );

  const trimMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: skin.trimColor,
      roughness: 0.28,
      metalness: 0.35,
      emissive: new THREE.Color(skin.trimColor),
      emissiveIntensity: 0.15,
    })
  );

  const glowMat = assets.regMat(
    new THREE.MeshBasicMaterial({
      color: skin.glowColor,
      side: THREE.BackSide,
    })
  );

  const silverMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.9,
    })
  );

  const innerEarMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.75,
    })
  );

  const eyeWhiteMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.2,
      emissive: 0x334155,
      emissiveIntensity: 0.2,
    })
  );

  const pupilMat = assets.regMat(new THREE.MeshBasicMaterial({ color: 0x050508 }));
  const logoDecalMat = assets.regMat(
    new THREE.MeshBasicMaterial({
      map: assets.foreheadTex,
      transparent: true,
      depthWrite: false,
    })
  );

  // --- TORSO & TUXEDO ---
  const torso = new THREE.Group();
  torso.position.set(0, 0.92, 0);
  bodyPivot.add(torso);

  const jacketGeo = assets.regGeo(new THREE.CylinderGeometry(0.24, 0.29, 0.64, 14));
  const jacket = new THREE.Mesh(jacketGeo, suitMat);
  jacket.castShadow = true;
  addOutlineHull(jacket, glowMat, 1.07);
  torso.add(jacket);

  const shirtGeo = assets.regGeo(new THREE.BoxGeometry(0.2, 0.44, 0.06));
  const shirt = new THREE.Mesh(shirtGeo, shirtMat);
  shirt.position.set(0, 0.08, -0.22);
  torso.add(shirt);

  const lapelGeo = assets.regGeo(new THREE.BoxGeometry(0.05, 0.38, 0.03));
  const lapelL = new THREE.Mesh(lapelGeo, trimMat);
  lapelL.position.set(-0.1, 0.09, -0.24);
  lapelL.rotation.z = -0.22;
  torso.add(lapelL);

  const lapelR = new THREE.Mesh(lapelGeo, trimMat);
  lapelR.position.set(0.1, 0.09, -0.24);
  lapelR.rotation.z = 0.22;
  torso.add(lapelR);

  const bowCenter = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.06, 0.05, 0.04)),
    silverMat
  );
  bowCenter.position.set(0, 0.25, -0.255);
  torso.add(bowCenter);

  const bowWingGeo = assets.regGeo(new THREE.ConeGeometry(0.055, 0.1, 4));
  const bowL = new THREE.Mesh(bowWingGeo, suitMat);
  bowL.rotation.z = -Math.PI / 2;
  bowL.position.set(-0.07, 0.25, -0.255);
  torso.add(bowL);

  const bowR = new THREE.Mesh(bowWingGeo, suitMat);
  bowR.rotation.z = Math.PI / 2;
  bowR.position.set(0.07, 0.25, -0.255);
  torso.add(bowR);

  const btnGeo = assets.regGeo(new THREE.SphereGeometry(0.022, 8, 8));
  for (let b = 0; b < 3; b++) {
    const btn = new THREE.Mesh(btnGeo, silverMat);
    btn.position.set(0, 0.08 - b * 0.095, -0.26);
    torso.add(btn);
  }

  // Tuxedo Coattails on the BACK (+Z, facing camera!)
  const coattailGeo = assets.regGeo(new THREE.BoxGeometry(0.18, 0.34, 0.04));
  const coattailL = new THREE.Mesh(coattailGeo, suitMat);
  coattailL.position.set(-0.11, -0.32, 0.22);
  coattailL.rotation.x = 0.14;
  coattailL.rotation.z = -0.08;
  coattailL.castShadow = true;
  addOutlineHull(coattailL, glowMat, 1.09);
  torso.add(coattailL);

  const coattailR = new THREE.Mesh(coattailGeo, suitMat);
  coattailR.position.set(0.11, -0.32, 0.22);
  coattailR.rotation.x = 0.14;
  coattailR.rotation.z = 0.08;
  coattailR.castShadow = true;
  addOutlineHull(coattailR, glowMat, 1.09);
  torso.add(coattailR);

  const backCollar = new THREE.Mesh(
    assets.regGeo(new THREE.TorusGeometry(0.18, 0.024, 8, 18)),
    shirtMat
  );
  backCollar.rotation.x = Math.PI / 2;
  backCollar.position.set(0, 0.31, 0);
  torso.add(backCollar);

  const tailTrimGeo = assets.regGeo(new THREE.BoxGeometry(0.19, 0.028, 0.048));
  const tailTrimL = new THREE.Mesh(tailTrimGeo, trimMat);
  tailTrimL.position.set(-0.11, -0.47, 0.24);
  tailTrimL.rotation.x = 0.14;
  tailTrimL.rotation.z = -0.08;
  torso.add(tailTrimL);

  const tailTrimR = new THREE.Mesh(tailTrimGeo, trimMat);
  tailTrimR.position.set(0.11, -0.47, 0.24);
  tailTrimR.rotation.x = 0.14;
  tailTrimR.rotation.z = 0.08;
  torso.add(tailTrimR);

  // --- HEAD ---
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0);
  torso.add(head);

  const craniumGeo = assets.regGeo(new THREE.SphereGeometry(0.32, 20, 16));
  const cranium = new THREE.Mesh(craniumGeo, furMat);
  cranium.scale.set(1.12, 0.94, 0.98);
  cranium.castShadow = true;
  addOutlineHull(cranium, glowMat, 1.07);
  head.add(cranium);

  const earGeo = assets.regGeo(new THREE.ConeGeometry(0.125, 0.28, 10));
  const innerEarGeo = assets.regGeo(new THREE.ConeGeometry(0.075, 0.2, 8));
  const tuftGeo = assets.regGeo(new THREE.ConeGeometry(0.04, 0.09, 6));
  for (const side of [-1, 1]) {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.22, 0.26, 0.02);
    earGroup.rotation.z = -side * 0.28;
    earGroup.rotation.x = -0.08;

    const earMesh = new THREE.Mesh(earGeo, furMat);
    earMesh.castShadow = true;
    addOutlineHull(earMesh, glowMat, 1.09);
    earGroup.add(earMesh);

    const innerMesh = new THREE.Mesh(innerEarGeo, innerEarMat);
    innerMesh.position.set(0, -0.01, -0.045);
    earGroup.add(innerMesh);

    const tuft = new THREE.Mesh(tuftGeo, shirtMat);
    tuft.position.set(-side * 0.02, -0.04, -0.07);
    tuft.rotation.z = side * 0.45;
    earGroup.add(tuft);

    head.add(earGroup);
  }

  const foreheadBadge = new THREE.Mesh(
    assets.regGeo(new THREE.PlaneGeometry(0.18, 0.18)),
    logoDecalMat
  );
  foreheadBadge.position.set(0, 0.14, -0.312);
  foreheadBadge.rotation.y = Math.PI;
  head.add(foreheadBadge);

  const eyeGeo = assets.regGeo(new THREE.SphereGeometry(0.068, 12, 12));
  const pupilGeo = assets.regGeo(new THREE.SphereGeometry(0.036, 10, 10));
  const glintGeo = assets.regGeo(new THREE.SphereGeometry(0.012, 6, 6));
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    eye.scale.set(1.15, 0.85, 0.55);
    eye.position.set(side * 0.13, 0.01, -0.285);
    eye.rotation.y = -side * 0.2;
    head.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.scale.set(0.8, 1.1, 0.5);
    pupil.position.set(side * 0.135, 0.01, -0.318);
    head.add(pupil);

    const glint = new THREE.Mesh(glintGeo, shirtMat);
    glint.position.set(side * 0.145, 0.025, -0.33);
    head.add(glint);
  }

  const nose = new THREE.Mesh(
    assets.regGeo(new THREE.SphereGeometry(0.026, 8, 8)),
    assets.regMat(new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 }))
  );
  nose.scale.set(1.3, 0.8, 0.8);
  nose.position.set(0, -0.055, -0.315);
  head.add(nose);

  const whiskerGeo = assets.regGeo(new THREE.CylinderGeometry(0.004, 0.003, 0.22, 5));
  for (const side of [-1, 1]) {
    for (let w = -1; w <= 1; w++) {
      const whisker = new THREE.Mesh(whiskerGeo, pupilMat);
      whisker.rotation.z = Math.PI / 2 + w * 0.12 * side;
      whisker.position.set(side * 0.34, -0.05 + w * 0.03, -0.2);
      head.add(whisker);
    }
  }

  // --- ARMS & CUFFS ---
  const sleeveGeo = assets.regGeo(new THREE.CylinderGeometry(0.078, 0.068, 0.42, 10));
  const cuffGeo = assets.regGeo(new THREE.CylinderGeometry(0.078, 0.078, 0.075, 10));
  const cuffTrimGeo = assets.regGeo(new THREE.TorusGeometry(0.078, 0.012, 6, 14));
  const cuffLogoGeo = assets.regGeo(new THREE.PlaneGeometry(0.065, 0.065));
  const pawGeo = assets.regGeo(new THREE.SphereGeometry(0.075, 10, 10));

  const createArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.31, 0.22, 0);

    const sleeve = new THREE.Mesh(sleeveGeo, suitMat);
    sleeve.position.y = -0.19;
    sleeve.castShadow = true;
    addOutlineHull(sleeve, glowMat, 1.09);
    armGroup.add(sleeve);

    const cuff = new THREE.Mesh(cuffGeo, suitMat);
    cuff.position.y = -0.38;
    armGroup.add(cuff);

    const cuffTrim = new THREE.Mesh(cuffTrimGeo, trimMat);
    cuffTrim.rotation.x = Math.PI / 2;
    cuffTrim.position.y = -0.345;
    armGroup.add(cuffTrim);

    const cuffLogo = new THREE.Mesh(cuffLogoGeo, logoDecalMat);
    cuffLogo.position.set(side * 0.079, -0.38, 0);
    cuffLogo.rotation.y = side * (Math.PI / 2);
    armGroup.add(cuffLogo);

    const paw = new THREE.Mesh(pawGeo, furMat);
    paw.scale.set(0.9, 1.1, 0.95);
    paw.position.y = -0.46;
    addOutlineHull(paw, glowMat, 1.09);
    armGroup.add(paw);

    return armGroup;
  };

  const leftArm = createArm(-1);
  const rightArm = createArm(1);
  torso.add(leftArm, rightArm);

  // Spray paint can (Intro Scene 2)
  const sprayCan = new THREE.Group();
  sprayCan.position.set(0, -0.48, -0.09);
  const canBody = new THREE.Mesh(
    assets.regGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.14, 10)),
    assets.regMat(
      new THREE.MeshStandardMaterial({ color: 0x9333ea, metalness: 0.6, roughness: 0.25 })
    )
  );
  const canNozzle = new THREE.Mesh(
    assets.regGeo(new THREE.CylinderGeometry(0.015, 0.02, 0.03, 6)),
    shirtMat
  );
  canNozzle.position.y = 0.085;
  sprayCan.add(canBody, canNozzle);
  sprayCan.visible = false;
  rightArm.add(sprayCan);

  // --- LEGS & PAWS ---
  const thighGeo = assets.regGeo(new THREE.CylinderGeometry(0.095, 0.076, 0.48, 10));
  const stripeGeo = assets.regGeo(new THREE.BoxGeometry(0.018, 0.42, 0.02));
  const footGeo = assets.regGeo(new THREE.SphereGeometry(0.095, 10, 10));

  const createLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.135, 0.56, 0);

    const thigh = new THREE.Mesh(thighGeo, furMat);
    thigh.position.y = -0.23;
    thigh.castShadow = true;
    addOutlineHull(thigh, glowMat, 1.09);
    legGroup.add(thigh);

    const stripe = new THREE.Mesh(stripeGeo, trimMat);
    stripe.position.set(side * 0.088, -0.22, 0);
    legGroup.add(stripe);

    const foot = new THREE.Mesh(footGeo, furMat);
    foot.scale.set(0.95, 0.65, 1.38);
    foot.position.set(0, -0.49, -0.04);
    foot.castShadow = true;
    addOutlineHull(foot, glowMat, 1.09);
    legGroup.add(foot);

    return legGroup;
  };

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  bodyPivot.add(leftLeg, rightLeg);

  // --- LONG CURVED TAIL (+Z side) ---
  const tailSegments: THREE.Group[] = [];
  let parentTail: THREE.Object3D = torso;
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Group();
    if (i === 0) seg.position.set(0, -0.22, 0.24);
    else seg.position.set(0, 0, 0.16);
    const radius = 0.068 - i * 0.006;
    const mesh = new THREE.Mesh(
      assets.regGeo(new THREE.CapsuleGeometry(radius, 0.13, 5, 8)),
      furMat
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = 0.08;
    mesh.castShadow = true;
    addOutlineHull(mesh, glowMat, 1.12);
    seg.add(mesh);

    parentTail.add(seg);
    tailSegments.push(seg);
    parentTail = seg;
  }

  // --- FLUTON SHIELD BUBBLE ---
  const shieldShell = new THREE.Mesh(
    assets.regGeo(new THREE.IcosahedronGeometry(1.05, 1)),
    assets.regMat(
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.28,
        wireframe: true,
      })
    )
  );
  shieldShell.position.y = 0.95;
  shieldShell.visible = false;
  root.add(shieldShell);

  // --- PURPLE SPEED AURA RING AT FEET (Active during Boost / Hoverboard) ---
  const speedRing = new THREE.Mesh(
    assets.regGeo(new THREE.TorusGeometry(0.55, 0.032, 8, 24)),
    assets.regMat(
      new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0.75,
      })
    )
  );
  speedRing.rotation.x = Math.PI / 2;
  speedRing.position.y = 0.09;
  speedRing.visible = false;
  root.add(speedRing);

  // --- PURPLE MAGNETIC SETTLEMENT RING (Active during CONFIDENTIAL SETTLEMENT) ---
  const magnetRing = new THREE.Mesh(
    assets.regGeo(new THREE.TorusGeometry(0.74, 0.028, 8, 28)),
    assets.regMat(
      new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.82,
      })
    )
  );
  magnetRing.rotation.x = Math.PI / 2;
  magnetRing.position.y = 0.95;
  magnetRing.visible = false;
  root.add(magnetRing);

  return {
    root,
    bodyPivot,
    torso,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    tailSegments,
    sprayCan,
    shieldShell,
    speedRing,
    magnetRing,
    furMat,
    suitMat,
    shirtMat,
    trimMat,
    glowMat,
  };
}

/**
 * Builds the cartoon-style Railway Security Officer.
 */
export function createSecurityOfficer(assets: SharedAssetRegistry): OfficerRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const navyMat = assets.regMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
  const vestMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.45,
      emissive: 0x3f6212,
      emissiveIntensity: 0.15,
    })
  );
  const skinMat = assets.regMat(new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.65 }));
  const darkMat = assets.regMat(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
  const badgeMat = assets.regMat(
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.2 })
  );

  const torso = new THREE.Mesh(
    assets.regGeo(new THREE.CylinderGeometry(0.28, 0.33, 0.7, 12)),
    navyMat
  );
  torso.position.y = 1.02;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const vest = new THREE.Mesh(
    assets.regGeo(new THREE.CylinderGeometry(0.295, 0.34, 0.44, 12)),
    vestMat
  );
  vest.position.y = 0.02;
  torso.add(vest);

  const head = new THREE.Group();
  head.position.set(0, 1.56, 0);
  bodyPivot.add(head);

  const headMesh = new THREE.Mesh(assets.regGeo(new THREE.SphereGeometry(0.25, 14, 14)), skinMat);
  headMesh.castShadow = true;
  head.add(headMesh);

  const capCrown = new THREE.Mesh(
    assets.regGeo(new THREE.CylinderGeometry(0.27, 0.24, 0.14, 12)),
    darkMat
  );
  capCrown.position.y = 0.18;
  head.add(capCrown);

  const capVisor = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.32, 0.03, 0.22)),
    darkMat
  );
  capVisor.position.set(0, 0.12, -0.2);
  head.add(capVisor);

  const capBadge = new THREE.Mesh(
    assets.regGeo(new THREE.OctahedronGeometry(0.05, 0)),
    badgeMat
  );
  capBadge.position.set(0, 0.2, -0.25);
  head.add(capBadge);

  const stache = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.18, 0.04, 0.06)),
    darkMat
  );
  stache.position.set(0, -0.05, -0.24);
  head.add(stache);

  const armGeo = assets.regGeo(new THREE.CapsuleGeometry(0.085, 0.36, 5, 8));
  const legGeo = assets.regGeo(new THREE.CapsuleGeometry(0.1, 0.44, 5, 8));

  const makeLimb = (x: number, y: number, geo: THREE.BufferGeometry, h: number, mat: THREE.Material) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = -h * 0.55;
    m.castShadow = true;
    g.add(m);
    return g;
  };

  const leftArm = makeLimb(-0.37, 1.32, armGeo, 0.36, navyMat);
  const rightArm = makeLimb(0.37, 1.32, armGeo, 0.36, navyMat);
  const leftLeg = makeLimb(-0.14, 0.68, legGeo, 0.44, darkMat);
  const rightLeg = makeLimb(0.14, 0.68, legGeo, 0.44, darkMat);

  bodyPivot.add(leftArm, rightArm, leftLeg, rightLeg);

  return { root, bodyPivot, head, leftArm, rightArm, leftLeg, rightLeg };
}

/**
 * Builds the cartoon-style Security Dog.
 */
export function createSecurityDog(assets: SharedAssetRegistry): DogRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const coatMat = assets.regMat(new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 }));
  const saddleMat = assets.regMat(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.72 }));
  const collarMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 0.7,
      roughness: 0.3,
    })
  );

  const body = new THREE.Mesh(
    assets.regGeo(new THREE.CapsuleGeometry(0.2, 0.5, 6, 10)),
    coatMat
  );
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.48, 0);
  body.castShadow = true;
  bodyPivot.add(body);

  const saddle = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.36, 0.18, 0.44)),
    saddleMat
  );
  saddle.position.set(0, 0.58, 0.03);
  bodyPivot.add(saddle);

  const collar = new THREE.Mesh(
    assets.regGeo(new THREE.TorusGeometry(0.18, 0.035, 6, 14)),
    collarMat
  );
  collar.position.set(0, 0.55, -0.28);
  collar.rotation.x = 0.4;
  bodyPivot.add(collar);

  const head = new THREE.Group();
  head.position.set(0, 0.65, -0.36);
  bodyPivot.add(head);

  const skull = new THREE.Mesh(assets.regGeo(new THREE.SphereGeometry(0.18, 12, 12)), coatMat);
  head.add(skull);

  const snout = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.14, 0.1, 0.2)),
    saddleMat
  );
  snout.position.set(0, -0.02, -0.17);
  head.add(snout);

  const jaw = new THREE.Mesh(
    assets.regGeo(new THREE.BoxGeometry(0.11, 0.04, 0.17)),
    coatMat
  );
  jaw.position.set(0, -0.09, -0.15);
  head.add(jaw);

  const earGeo = assets.regGeo(new THREE.ConeGeometry(0.06, 0.16, 7));
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(earGeo, saddleMat);
    ear.position.set(s * 0.11, 0.19, 0.02);
    ear.rotation.z = -s * 0.2;
    head.add(ear);
  }

  const legGeo = assets.regGeo(new THREE.CylinderGeometry(0.055, 0.042, 0.34, 7));
  const makeDogLeg = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.36, z);
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.y = -0.17;
    leg.castShadow = true;
    g.add(leg);
    return g;
  };

  const legFL = makeDogLeg(-0.13, -0.22);
  const legFR = makeDogLeg(0.13, -0.22);
  const legBL = makeDogLeg(-0.13, 0.22);
  const legBR = makeDogLeg(0.13, 0.22);
  bodyPivot.add(legFL, legFR, legBL, legBR);

  const tail = new THREE.Group();
  tail.position.set(0, 0.56, 0.32);
  const tailMesh = new THREE.Mesh(
    assets.regGeo(new THREE.CapsuleGeometry(0.04, 0.24, 5, 7)),
    saddleMat
  );
  tailMesh.rotation.x = 0.7;
  tailMesh.position.set(0, 0.1, 0.1);
  tail.add(tailMesh);
  bodyPivot.add(tail);

  return { root, bodyPivot, head, jaw, legFL, legFR, legBL, legBR, tail };
}

/**
 * Builds the futuristic Fluton Hoverboard (black & purple + official Fluton logo).
 */
export function createHoverboard(
  skin: HoverboardSkinDef,
  assets: SharedAssetRegistry
): HoverboardRig {
  const root = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(0, 0.78);
  shape.quadraticCurveTo(0.32, 0.62, 0.3, 0.15);
  shape.lineTo(0.28, -0.58);
  shape.quadraticCurveTo(0, -0.82, -0.28, -0.58);
  shape.lineTo(-0.3, 0.15);
  shape.quadraticCurveTo(-0.32, 0.62, 0, 0.78);

  const deckGeo = assets.regGeo(
    new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    })
  );
  deckGeo.rotateX(Math.PI / 2);
  deckGeo.center();

  const deckMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: skin.deckColor,
      roughness: 0.25,
      metalness: 0.65,
    })
  );

  const deck = new THREE.Mesh(deckGeo, deckMat);
  deck.castShadow = true;
  root.add(deck);

  const railMat = assets.regMat(
    new THREE.MeshStandardMaterial({
      color: skin.railColor,
      emissive: skin.glowColor,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    })
  );
  const railGeo = assets.regGeo(new THREE.BoxGeometry(0.045, 0.055, 1.18));
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-0.29, 0.01, 0);
  const railR = new THREE.Mesh(railGeo, railMat);
  railR.position.set(0.29, 0.01, 0);
  root.add(railL, railR);

  const logoPlate = new THREE.Mesh(
    assets.regGeo(new THREE.CircleGeometry(0.22, 20)),
    assets.regMat(new THREE.MeshBasicMaterial({ map: assets.tokenTex }))
  );
  logoPlate.rotation.x = -Math.PI / 2;
  logoPlate.rotation.z = Math.PI;
  logoPlate.position.y = 0.062;
  root.add(logoPlate);

  const thrusterGeo = assets.regGeo(new THREE.ConeGeometry(0.08, 0.38, 8));
  thrusterGeo.rotateX(Math.PI / 2);
  const thrusterMat = assets.regMat(
    new THREE.MeshBasicMaterial({
      color: skin.glowColor,
      transparent: true,
      opacity: 0.85,
    })
  );
  const thrusterLeft = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterLeft.position.set(-0.14, 0, 0.85);
  const thrusterRight = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterRight.position.set(0.14, 0, 0.85);
  root.add(thrusterLeft, thrusterRight);

  return { root, deckMat, railMat, thrusterLeft, thrusterRight };
}

/**
 * Builds an official collectible Fluton Token using ONLY shared geometries & materials.
 */
export function createFlutonTokenMesh(assets: SharedAssetRegistry): THREE.Group {
  const group = new THREE.Group();

  const coinBody = new THREE.Mesh(assets.tokenBodyGeo, [
    assets.tokenRimMat,
    assets.tokenFaceMat,
    assets.tokenFaceMat,
  ]);
  group.add(coinBody);

  const glowRing = new THREE.Mesh(assets.tokenRingGeo, assets.tokenGlowMat);
  group.add(glowRing);

  return group;
}

/**
 * Builds a multi-part futuristic gFluton train (length ~16.5m, width 2.48m, roof height 3.25m)
 * using shared geometries, textures & materials from SharedAssetRegistry.
 */
export function createFuturisticTrain(
  assets: SharedAssetRegistry,
  paletteIdx: number,
  withGraffiti: boolean,
  withRamp: boolean
): {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  paletteIndex: number;
} {
  const idx = ((paletteIdx % TRAIN_PALETTES.length) + TRAIN_PALETTES.length) % TRAIN_PALETTES.length;
  const group = new THREE.Group();
  const len = 16.5;
  const height = 3.25;

  const sideMat = withGraffiti ? assets.trainSideGraffitiMats[idx] : assets.trainSideCleanMats[idx];
  const frontMat = assets.trainFrontMats[idx];
  const neonMat = assets.trainNeonStripMats[idx];

  // Main chassis body
  const bodyMesh = new THREE.Mesh(assets.trainBodyGeo, [
    sideMat,
    sideMat,
    assets.trainRoofMat,
    assets.trainUndercarriageMat,
    frontMat,
    frontMat,
  ]);
  bodyMesh.position.y = height * 0.5 + 0.15;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Glowing side neon accent strips along both sides
  for (const sx of [-1.255, 1.255]) {
    const strip = new THREE.Mesh(assets.trainNeonStripGeo, neonMat);
    strip.position.set(sx, 0.62, 0);
    group.add(strip);
  }

  // Aerodynamic front & rear cabs (+Z faces player)
  for (const dir of [-1, 1]) {
    const cab = new THREE.Mesh(assets.trainCabGeo, frontMat);
    cab.position.set(0, height * 0.5 + 0.05, dir * (len * 0.5 - 0.55));
    cab.rotation.x = dir * -0.14;
    cab.castShadow = true;
    group.add(cab);

    const glass = new THREE.Mesh(assets.trainGlassGeo, assets.trainGlassMat);
    glass.position.set(0, height * 0.67, dir * (len * 0.5 - 0.05));
    glass.rotation.x = dir * -0.14;
    group.add(glass);

    // Glowing LED destination strip above windshield
    const destLed = new THREE.Mesh(assets.trainDestBarGeo, assets.trainDestLedMat);
    destLed.position.set(0, height * 0.86, dir * (len * 0.5 - 0.15));
    destLed.rotation.x = dir * -0.14;
    group.add(destLed);

    const lightMat = dir === 1 ? assets.trainHeadlightFrontMat : assets.trainHeadlightRearMat;
    for (const sx of [-0.72, 0.72]) {
      const hl = new THREE.Mesh(assets.trainHeadlightGeo, lightMat);
      hl.rotation.x = Math.PI / 2;
      hl.position.set(sx, 0.95, dir * (len * 0.5 + 0.04));
      group.add(hl);
    }
  }

  // Roof HVAC & pantograph unit
  for (const rz of [-4.5, 0, 4.5]) {
    const pod = new THREE.Mesh(assets.trainAcGeo, assets.trainAcMat);
    pod.position.set(0, height + 0.04, rz);
    group.add(pod);
  }
  const panto = new THREE.Mesh(assets.trainPantoGeo, neonMat);
  panto.position.set(0, height + 0.22, -2.2);
  group.add(panto);

  // Undercarriage wheels
  for (const wz of [-6.0, -4.4, 4.4, 6.0]) {
    for (const wx of [-0.95, 0.95]) {
      const wheel = new THREE.Mesh(assets.trainWheelGeo, assets.trainWheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.32, wz);
      group.add(wheel);
    }
  }

  // Optional sloped boarding ramp on +Z end
  if (withRamp) {
    const ramp = new THREE.Mesh(assets.trainRampGeo, assets.trainRampMat);
    ramp.position.set(0, height * 0.5 - 0.02, len * 0.5 + 1.85);
    ramp.rotation.x = 0.72;
    ramp.receiveShadow = true;
    ramp.castShadow = true;
    group.add(ramp);

    for (const gx of [-1.02, 1.02]) {
      const guide = new THREE.Mesh(assets.trainRampGuideGeo, assets.trainGuideMat);
      guide.position.set(gx, height * 0.5 + 0.12, len * 0.5 + 1.85);
      guide.rotation.x = 0.72;
      group.add(guide);
    }
  }

  return { group, bodyMesh, paletteIndex: idx };
}

/**
 * Builds Jump-Over Barrier, Slide-Under Overhead Barrier, Roadblock, or Tall Construction Obstacle
 * using ONLY shared geometries & materials.
 */
export function createObstacleMesh(
  kind: 'barrier' | 'overhead' | 'roadblock' | 'construction',
  assets: SharedAssetRegistry
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'barrier') {
    for (const sx of [-1.05, 1.05]) {
      const post = new THREE.Mesh(assets.barrierPostGeo, assets.metalMat);
      post.position.set(sx, 0.525, 0);
      post.castShadow = true;
      group.add(post);

      const cap = new THREE.Mesh(assets.barrierCapGeo, assets.glowPurpleMat);
      cap.position.set(sx, 1.08, 0);
      group.add(cap);
    }
    const plank = new THREE.Mesh(assets.barrierPlankGeo, assets.hazardMat);
    plank.position.set(0, 0.76, 0);
    plank.castShadow = true;
    group.add(plank);
  } else if (kind === 'overhead') {
    for (const sx of [-1.22, 1.22]) {
      const pillar = new THREE.Mesh(assets.overheadPillarGeo, assets.metalMat);
      pillar.position.set(sx, 1.375, 0);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const header = new THREE.Mesh(assets.overheadHeaderGeo, assets.hazardMat);
    header.position.set(0, 1.98, 0);
    header.castShadow = true;
    group.add(header);

    const arrowBar = new THREE.Mesh(assets.overheadBarGeo, assets.glowPurpleMat);
    arrowBar.position.set(0, 1.5, 0);
    group.add(arrowBar);
  } else if (kind === 'roadblock') {
    const block = new THREE.Mesh(assets.roadBlockGeo, assets.concreteMat);
    block.position.y = 0.325;
    block.castShadow = true;
    group.add(block);

    const topStripe = new THREE.Mesh(assets.roadTopGeo, assets.hazardMat);
    topStripe.position.y = 0.76;
    topStripe.castShadow = true;
    group.add(topStripe);

    for (const cx of [-0.9, 0.9]) {
      const cone = new THREE.Mesh(assets.roadConeGeo, assets.coneMat);
      cone.position.set(cx, 0.275, 0.42);
      cone.castShadow = true;
      group.add(cone);
    }
  } else {
    const base = new THREE.Mesh(assets.towerBaseGeo, assets.hazardMat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    const frame = new THREE.Mesh(assets.towerFrameGeo, assets.metalMat);
    frame.position.y = 1.6;
    frame.castShadow = true;
    group.add(frame);

    const beacon = new THREE.Mesh(assets.towerBeaconGeo, assets.redBeaconMat);
    beacon.position.y = 2.82;
    group.add(beacon);
  }

  return group;
}

/**
 * Builds the 4 Fluton Ecosystem 3D Power-Up collectibles with upright camera-facing labels.
 */
export function createPowerUpMesh(
  type: PowerUpType,
  assets: SharedAssetRegistry
): THREE.Group {
  const group = new THREE.Group();
  const spinGroup = new THREE.Group();
  group.add(spinGroup);
  group.userData.spinGroup = spinGroup;

  if (type === 'fhe') {
    // FHE: Black & purple energy capsule + digital encryption cylinder + orbiting nodes
    const auraRing = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    auraRing.rotation.x = 0.45;
    spinGroup.add(auraRing);

    const capsuleCore = new THREE.Mesh(
      assets.regGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 12)),
      assets.puCipherMat
    );
    spinGroup.add(capsuleCore);

    const capGeo = assets.regGeo(new THREE.CylinderGeometry(0.265, 0.265, 0.12, 12));
    const topCap = new THREE.Mesh(capGeo, assets.puDarkHullMat);
    topCap.position.y = 0.34;
    const botCap = new THREE.Mesh(capGeo, assets.puDarkHullMat);
    botCap.position.y = -0.34;
    spinGroup.add(topCap, botCap);

    const nodeGeo = assets.regGeo(new THREE.OctahedronGeometry(0.08, 0));
    for (const sx of [-0.46, 0.46]) {
      const node = new THREE.Mesh(nodeGeo, assets.puSilverMat);
      node.position.set(sx, 0, 0);
      spinGroup.add(node);
    }
  } else if (type === 'zero_mev') {
    // ZERO MEV: Purple lightning-shaped collectible + electric ring
    const auraRing = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    spinGroup.add(auraRing);

    const bolt = new THREE.Shape();
    bolt.moveTo(0.08, 0.46);
    bolt.lineTo(-0.24, 0.04);
    bolt.lineTo(-0.02, 0.04);
    bolt.lineTo(-0.14, -0.46);
    bolt.lineTo(0.26, -0.02);
    bolt.lineTo(0.04, -0.02);
    bolt.closePath();

    const boltGeo = assets.regGeo(
      new THREE.ExtrudeGeometry(bolt, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.03,
        bevelSegments: 2,
      })
    );
    boltGeo.center();
    const boltMesh = new THREE.Mesh(boltGeo, assets.puLightningMat);
    spinGroup.add(boltMesh);

    const frame = new THREE.Mesh(
      assets.regGeo(new THREE.TorusGeometry(0.46, 0.025, 6, 6)),
      assets.puDarkHullMat
    );
    spinGroup.add(frame);
  } else if (type === 'encrypted_intents') {
    // ENCRYPTED INTENTS: Futuristic holographic purple capsule + twin digital rings
    const ring1 = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    ring1.rotation.set(0.55, 0.35, 0);
    const ring2 = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    ring2.rotation.set(-0.55, -0.35, 0);
    spinGroup.add(ring1, ring2);

    const innerCipher = new THREE.Mesh(
      assets.regGeo(new THREE.OctahedronGeometry(0.22, 0)),
      assets.puCipherMat
    );
    innerCipher.scale.set(0.85, 1.45, 0.85);
    spinGroup.add(innerCipher);

    const holoCapsule = new THREE.Mesh(
      assets.regGeo(new THREE.CapsuleGeometry(0.26, 0.38, 6, 12)),
      assets.puHoloMat
    );
    spinGroup.add(holoCapsule);
  } else if (type === 'confidential_settlement') {
    // CONFIDENTIAL SETTLEMENT: Premium purple energy orb + dual glowing circular rings
    const orb = new THREE.Mesh(
      assets.regGeo(new THREE.IcosahedronGeometry(0.3, 1)),
      assets.puCoreMat
    );
    spinGroup.add(orb);

    const ringOuter = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    const ringEquatorial = new THREE.Mesh(
      assets.regGeo(new THREE.TorusGeometry(0.45, 0.03, 8, 22)),
      assets.puSilverMat
    );
    ringEquatorial.rotation.x = Math.PI / 2;
    const ringTilt = new THREE.Mesh(
      assets.regGeo(new THREE.TorusGeometry(0.5, 0.024, 8, 22)),
      assets.puAuraMat
    );
    ringTilt.rotation.set(0.7, 0.6, 0);
    spinGroup.add(ringOuter, ringEquatorial, ringTilt);
  } else {
    // Fallback / Hoverboard icon
    const auraRing = new THREE.Mesh(assets.puAuraGeo, assets.puAuraMat);
    spinGroup.add(auraRing);
    const miniBoard = new THREE.Mesh(
      assets.regGeo(new THREE.BoxGeometry(0.28, 0.06, 0.65)),
      assets.puCoreMat
    );
    miniBoard.rotation.set(0.35, 0.5, 0.2);
    spinGroup.add(miniBoard);
  }

  // Upright camera-facing floating label directly above collectible (always readable!)
  if (type !== 'hoverboard') {
    const labelMat = assets.puLabelMats[type];
    const labelPlate = new THREE.Mesh(assets.puLabelGeo, labelMat);
    labelPlate.position.set(0, 0.88, 0);
    group.add(labelPlate);
  }

  return group;
}

/**
 * Builds a lush palm tree sharing geometries & materials via SharedAssetRegistry.
 */
export function createPalmTree(assets: SharedAssetRegistry): THREE.Group {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(assets.palmTrunkGeo, assets.palmTrunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  group.add(trunk);

  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(assets.palmFrondGeo, assets.palmLeafMat);
    frond.scale.set(1.2, 1, 0.2);
    const angle = (i / 6) * Math.PI * 2;
    frond.position.set(-0.15 + Math.cos(angle) * 0.9, 4.05, Math.sin(angle) * 0.9);
    frond.rotation.z = Math.cos(angle) * 1.1;
    frond.rotation.x = -Math.sin(angle) * 1.1;
    frond.castShadow = true;
    group.add(frond);
  }

  return group;
}
