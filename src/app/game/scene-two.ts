import {
	AbstractMesh,
	AnimationGroup,
	ArcRotateCamera,
	Color3,
	Color4,
	Engine,
	FreeCamera,
	HemisphericLight,
	Mesh,
	MeshBuilder,
	Quaternion,
	Scene,
	SceneLoader,
	StandardMaterial,
	TransformNode,
	Vector3,
	Viewport,
} from "@babylonjs/core";
import "@babylonjs/loaders";

interface PlacementConfig {
	position: Vector3;
	scaling: Vector3;
	rotationY: number;
}

interface EnemyInstance {
	mesh: Mesh;
	health: number;
	maxHealth: number;
	barRoot: TransformNode;
	barFill: Mesh;
	barBackground: Mesh;
	barWidth: number;
}

type PowerUpType = "health" | "speed" | "rapidFire";

type GameState = "running" | "paused" | "gameOver";

interface PowerUpInstance {
	mesh: Mesh;
	type: PowerUpType;
	lifetime: number;
	rotationSpeed: number;
	bobPhase: number;
}

export class BabylonSceneTwo {
	public engine: Engine;
	public scene: Scene;
	public camera: ArcRotateCamera;
	public character: Mesh | null = null;
	public animationGroups: AnimationGroup[] = [];
	public isReady = false;

	public joystickInput: { angle: number | null; distance: number | null } = {
		angle: null,
		distance: null,
	};

	private readonly handleResize = () => {
		const isMobile = this.isMobileDevice();
		const devicePixelRatio = window.devicePixelRatio || 1;
		const maxScale = isMobile ? 3 : 2.5;
		const scaleFactor = Math.min(devicePixelRatio, maxScale);
		
		this.engine.setHardwareScalingLevel(1 / scaleFactor);
		this.engine.resize();
		this.scene.render();
	};

	private isMobileDevice(): boolean {
		const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
		const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
		const isMobileUA = mobileRegex.test(userAgent.toLowerCase());
		const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		const isSmallScreen = window.innerWidth < 768;
		const hasOrientation = typeof window.orientation !== 'undefined';
		
		return isMobileUA || (hasTouch && isSmallScreen) || hasOrientation;
	}

	private setupMobileOptimizations(): void {
		this.scene.skipPointerMovePicking = true;
		const imageProcessing = this.scene.imageProcessingConfiguration;
		imageProcessing.contrast = 1.02;
	}

	private readonly readyListeners: Array<() => void> = [];
	private freeCamera: FreeCamera | null = null;
	private activeCameraType: "arc" | "free" = "arc";
	private lastCharacterPosition: Vector3 | null = null;
	private readonly groundSize = 320;
	private readonly baseMovementSpeed = 0.85;
	private movementSpeedMultiplier = 1;
	private characterAnchor: TransformNode | AbstractMesh | null = null;
	private enemies: EnemyInstance[] = [];
	private bullets: Array<{ mesh: Mesh; direction: Vector3; life: number }> = [];
	private enemySpawnTimer = 0;
	private readonly enemySpawnInterval = 5;
	private readonly maxEnemies = 6;
	private readonly enemySpeed = 18;
	private readonly enemyMaxHealth = 60;
	private readonly bulletDamage = 30;
	private readonly playerCollisionDamage = 20;
	private readonly bulletSpeed = 120;
	private readonly bulletLifetime = 3;
	private shootCooldown = 0;
	private readonly baseShootInterval = 0.4;
	private currentShootInterval = this.baseShootInterval;
	private lastMovementDirection: Vector3 = new Vector3(0, 0, 1);
	private enemyMaterial: StandardMaterial | null = null;
	private bulletMaterial: StandardMaterial | null = null;
	private enemyBarBackgroundMaterial: StandardMaterial | null = null;
	private enemyBarFillMaterial: StandardMaterial | null = null;
	private readonly playerMaxHealth = 100;
	private playerHealth = this.playerMaxHealth;
	private isPlayerDefeated = false;
	private playerInvulnerable = false;
	private playerInvulnerableTimer = 0;
	private readonly playerInvulnerableDuration = 1.5; // 1.5 segundos de invulnerabilidad
	private readonly playerHealthListeners: Array<(health: number, maxHealth: number) => void> = [];
	private currentState: GameState = "running";
	private readonly gameStateListeners: Array<(state: GameState) => void> = [];
	private powerUps: PowerUpInstance[] = [];
	private powerUpSpawnTimer = 0;
	private readonly powerUpSpawnInterval = 12;
	private readonly maxPowerUps = 3;
	private readonly powerUpLifetime = 25;
	private readonly powerUpRotationSpeed = Math.PI;
	private readonly powerUpBobHeight = 0.6;
	private readonly powerUpHealthAmount = 30;
	private readonly speedBoostMultiplier = 1.7;
	private readonly speedBoostDuration = 10;
	private readonly rapidFireInterval = 0.18;
	private readonly rapidFireDuration = 8;
	private readonly powerUpListeners: Array<(effects: Array<{ type: PowerUpType; remaining: number }>) => void> = [];
	private activePowerUps = new Map<PowerUpType, number>();
	private powerUpMaterials = new Map<PowerUpType, StandardMaterial>();
	private autoFireEnabled = false;
	private autoFireTimer = 0;
	private readonly autoFireInterval = 2.0; // 2 segundos

	constructor(private readonly canvas: HTMLCanvasElement, public home?: any) {
		this.canvas.style.touchAction = "none";
		
		// Detectar si es dispositivo móvil
		const isMobile = this.isMobileDevice();
		
		this.engine = new Engine(this.canvas, true, {
			antialias: true,
			adaptToDeviceRatio: true,
			powerPreference: "high-performance",
			preserveDrawingBuffer: false,
			stencil: true
		});
		
		// Configuración de resolución optimizada para ambos dispositivos
		const devicePixelRatio = window.devicePixelRatio || 1;
		
		// Configuración universal: usar DPI con límite inteligente
		const maxScale = isMobile ? 3 : 2.5; // Móviles hasta 3x, desktop hasta 2.5x
		const scaleFactor = Math.min(devicePixelRatio, maxScale);
		
		this.engine.setHardwareScalingLevel(1 / scaleFactor);
		
		setTimeout(() => {
			this.engine.resize();
		}, 50);
		
		
		this.scene = new Scene(this.engine);
		
		// Configuraciones específicas para móviles
		if (isMobile) {
			this.setupMobileOptimizations();
		}
		
		this.camera = this.createCamera();
		this.createLight();
		this.createEnvironment();

		this.initialize()
			.catch((error) => console.error("BabylonSceneTwo initialization failed", error))
			.finally(() => {
				this.notifyReady();
			});

		this.scene.onBeforeRenderObservable.add(() => this.updateCharacterFromJoystick());
		this.runRenderLoop();
		
		window.addEventListener("load", () => {
			setTimeout(() => {
				this.handleResize();
			}, 200);
		});
		
		window.addEventListener("resize", this.handleResize);
	}

	public onReady(callback: () => void): void {
		if (this.isReady) {
			callback();
		} else {
			this.readyListeners.push(callback);
		}
	}

	private createCamera(): ArcRotateCamera {
		const camera = new ArcRotateCamera(
			"sceneTwoArcCamera",
			Math.PI / 4,
			Math.PI / 3,
			120,
			Vector3.Zero(),
			this.scene
		);
		camera.lowerAlphaLimit = camera.upperAlphaLimit = camera.alpha;
		camera.lowerBetaLimit = camera.upperBetaLimit = camera.beta;
		camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius;
		camera.panningSensibility = 0;
		camera.inputs.clear();
		
		this.scene.activeCamera = camera;
		return camera;
	}

	private createLight(): void {
		const light = new HemisphericLight("sceneTwoLight", new Vector3(0, 1, 0), this.scene);
		light.intensity = 1.2;
		light.diffuse = new Color3(1, 1, 1);
		light.specular = new Color3(0, 0, 0);
		light.groundColor = new Color3(0.3, 0.3, 0.3);
	}

	private createEnvironment(): void {
		const ground = MeshBuilder.CreateGround(
			"sceneTwoGround",
			{ width: this.groundSize, height: this.groundSize },
			this.scene
		);
		const groundMaterial = new StandardMaterial("sceneTwoGroundMaterial", this.scene);
		groundMaterial.diffuseColor = new Color3(0.28, 0.55, 0.32);
		groundMaterial.specularColor = new Color3(0, 0, 0); // Sin especular para mejor rendimiento
		groundMaterial.emissiveColor = new Color3(0, 0, 0); // Sin emisivo
		ground.material = groundMaterial;

		const box = MeshBuilder.CreateBox(
			"sceneTwoCharacterPlaceholder",
			{ size: 1.2 },
			this.scene
		);
		box.position.y = 0.6;
		const boxMaterial = new StandardMaterial("sceneTwoCharacterMaterial", this.scene);
		boxMaterial.diffuseColor = new Color3(0.2, 0.4, 1);
		boxMaterial.specularColor = new Color3(0, 0, 0); // Sin especular para mejor rendimiento  
		boxMaterial.emissiveColor = new Color3(0, 0, 0); // Sin emisivo
		box.material = boxMaterial;
		this.character = box;
		this.characterAnchor = box;
	}

	private async initialize(): Promise<void> {
		
		try {
			await Promise.all([
				this.loadCharacter(),
				this.loadTrees(),
				this.loadHouses(),
			]);

			this.spawnInitialEnemies(3);
			this.notifyPlayerHealthChange();
			this.notifyPowerUpEffectsChange();
			this.notifyGameStateChange();
			
		} catch (error) {
			console.error("Error al cargar assets:", error);
		}
	}

	private async loadCharacter(): Promise<void> {
		try {
			const result = await SceneLoader.ImportMeshAsync(
				"",
				"assets/modelos3D/",
				"personaje_1.glb",
				this.scene
			);

			const placeholder = this.scene.getMeshByName("sceneTwoCharacterPlaceholder");
			placeholder?.dispose();

			this.character = result.meshes.find((mesh): mesh is Mesh => mesh instanceof Mesh) ?? null;
			this.animationGroups.push(...result.animationGroups);

			const root = this.extractRootNode(result.meshes, result.transformNodes);
			if (root) {
				root.position = new Vector3(0, 0, 0);
				root.scaling = new Vector3(1.65, 1.65, 1.65);
				root.rotationQuaternion = Quaternion.Identity();
				this.characterAnchor = root;

				const focus = root.getAbsolutePosition();
				this.camera.target = focus;
			}
		} catch (error) {
			console.error("Failed to load character for scene-two", error);
			this.createCharacterPlaceholder();
		}
	}

	private createCharacterPlaceholder(): void {
		const placeholder = MeshBuilder.CreateBox("characterPlaceholder", { size: 2 }, this.scene);
		placeholder.position = new Vector3(0, 1, 0);
		this.characterAnchor = placeholder;
		this.character = placeholder;
		this.camera.target = placeholder.position;
	}

	private async loadTrees(): Promise<void> {
		await this.loadAndPlaceInstances("tree2.glb", [
			{ position: new Vector3(30, 0, 60), scaling: new Vector3(1.1, 1.1, 1.1), rotationY: 0.2 },
			{ position: new Vector3(-54, 0, -58), scaling: new Vector3(1.3, 1.3, 1.3), rotationY: 1.4 },
			{ position: new Vector3(86, 0, -72), scaling: new Vector3(1.4, 1.4, 1.4), rotationY: -0.7 },
			{ position: new Vector3(-90, 0, 78), scaling: new Vector3(1.1, 1.1, 1.1), rotationY: 2.2 },
		]);
	}

	private async loadHouses(): Promise<void> {
		await this.loadAndPlaceInstances("casa_8.glb", [
			{ position: new Vector3(120, 0, 110), scaling: new Vector3(1.85, 1.85, 1.85), rotationY: Math.PI / 10 },
			{ position: new Vector3(-118, 0, 140), scaling: new Vector3(1.7, 1.7, 1.7), rotationY: -Math.PI / 8 },
			{ position: new Vector3(0, 0, -150), scaling: new Vector3(1.6, 1.6, 1.6), rotationY: Math.PI / 3 },
		]);
	}

	private async loadAndPlaceInstances(fileName: string, placements: PlacementConfig[]): Promise<void> {
		for (const placement of placements) {
			try {
				const result = await SceneLoader.ImportMeshAsync(
					"",
					"assets/modelos3D/",
					fileName,
					this.scene
				);
				const rootNode = this.extractRootNode(result.meshes, result.transformNodes);
				if (rootNode) {
					rootNode.position = placement.position.clone();
					rootNode.scaling = placement.scaling.clone();
					rootNode.rotationQuaternion = Quaternion.FromEulerAngles(0, placement.rotationY, 0);
				}
			} catch (error) {
				console.error(`Failed to load asset ${fileName} for scene-two`, error);
			}
		}
	}

	private extractRootNode(meshes: AbstractMesh[], transforms: TransformNode[]): TransformNode | AbstractMesh | null {
		const transformRoot = transforms.find((node) => !node.parent);
		if (transformRoot) {
			return transformRoot;
		}
		const meshRoot = meshes.find((mesh) => !mesh.parent);
		return meshRoot ?? null;
	}

	private notifyReady(): void {
		this.isReady = true;
		
		setTimeout(() => {
			this.handleResize();
		}, 100);
		
		for (const listener of this.readyListeners) {
			listener();
		}
		this.readyListeners.length = 0;
	}

	private updateCharacterFromJoystick(): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		if (this.currentState !== "running") {
			return;
		}

		if (this.isPlayerDefeated) {
			return;
		}

		const { angle, distance } = this.joystickInput;
		if (angle === null || distance === null || distance <= 0) {
			return;
		}

		const clampedDistance = Math.min(distance, 60);
		const factor = (clampedDistance / 60) * this.baseMovementSpeed * this.movementSpeedMultiplier;
		const radians = (angle * Math.PI) / 180;

		const forward = this.camera.getDirection(Vector3.Forward()).normalize();
		const right = this.camera.getDirection(Vector3.Right()).normalize();

		const movement = right.scale(Math.cos(radians)).add(forward.scale(Math.sin(radians)));
		movement.y = 0;
		if (movement.lengthSquared() === 0) {
			return;
		}
		movement.normalize();
		this.lastMovementDirection = movement.clone();

		const deltaX = movement.x * factor;
		const deltaZ = movement.z * factor;

		const limit = this.groundSize / 2 - 5;
		const nextX = Math.min(limit, Math.max(-limit, anchor.position.x + deltaX));
		const nextZ = Math.min(limit, Math.max(-limit, anchor.position.z + deltaZ));

		anchor.position.x = nextX;
		anchor.position.z = nextZ;
		anchor.position.y = 0;

		const focus = anchor.getAbsolutePosition();
		this.camera.target = focus;
	}

	private runRenderLoop(): void {
		// Activar optimización de Angular al iniciar el bucle de renderizado
		if (this.home && typeof this.home.startGameOptimization === 'function') {
			this.home.startGameOptimization();
		}

		this.engine.runRenderLoop(() => {
			const deltaTime = this.engine.getDeltaTime() / 1000;
			this.updateGame(deltaTime);
			this.scene.render();
		});
	}

	setJoystickInput(angle: number | null, distance: number | null): void {
		if (this.currentState !== "running" || this.isPlayerDefeated) {
			this.joystickInput = { angle: null, distance: null };
			return;
		}
		this.joystickInput = { angle, distance };
	}

	private updateGame(deltaTime: number): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		if (this.currentState !== "running") {
			return;
		}

		if (this.isPlayerDefeated) {
			return;
		}

		this.shootCooldown = Math.max(0, this.shootCooldown - deltaTime);
		
		// Auto fire logic - dispara cada 2 segundos cuando está activo
		if (this.autoFireEnabled) {
			this.autoFireTimer += deltaTime;
			if (this.autoFireTimer >= this.autoFireInterval) {
				this.autoShoot(); // Usar método separado sin cooldown
				this.autoFireTimer = 0; // Reset timer
			}
		} else {
			this.autoFireTimer = 0; // Reset timer when auto fire is disabled
		}

		this.enemySpawnTimer += deltaTime;
		if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < this.maxEnemies) {
			this.spawnEnemy();
			this.enemySpawnTimer = 0;
		}

		this.powerUpSpawnTimer += deltaTime;
		if (this.powerUpSpawnTimer >= this.powerUpSpawnInterval && this.powerUps.length < this.maxPowerUps) {
			this.spawnPowerUp();
			this.powerUpSpawnTimer = 0;
		}

		this.updateEnemies(deltaTime);
		this.updateBullets(deltaTime);
		this.handleEnemyCollisions();
		this.updatePowerUps(deltaTime);
		this.updateActiveEffects(deltaTime);
		this.updateInvulnerability(deltaTime);

		const currentPosition = anchor.position.clone();
		if (
			!this.lastCharacterPosition ||
			!currentPosition.equalsWithEpsilon(this.lastCharacterPosition, 0.01)
		) {
			this.lastCharacterPosition = currentPosition;
		}
	}

	public bindShootButton(shootEl: HTMLElement): void {
		shootEl.style.touchAction = "none";
		const toggle = (ev: PointerEvent) => {
			ev.preventDefault();
			this.autoFireEnabled = !this.autoFireEnabled;
			shootEl.classList.toggle("active", this.autoFireEnabled);
			// Reset timer when toggling
			this.autoFireTimer = 0;
			// Si se activa, disparar inmediatamente
			if (this.autoFireEnabled) {
				this.autoShoot();
			}
		};
		shootEl.addEventListener("pointerdown", toggle);
	}

	public onPlayerHealthChange(callback: (current: number, max: number) => void): void {
		this.playerHealthListeners.push(callback);
		callback(this.playerHealth, this.playerMaxHealth);
	}

	public onPowerUpEffectsChange(
		callback: (effects: Array<{ type: PowerUpType; remaining: number }>) => void
	): void {
		this.powerUpListeners.push(callback);
		callback(this.getActivePowerUpsSnapshot());
	}

	public onGameStateChange(callback: (state: GameState) => void): void {
		this.gameStateListeners.push(callback);
		callback(this.currentState);
	}

	private damagePlayer(amount: number): void {
		if (this.isPlayerDefeated || this.playerInvulnerable) {
			return;
		}

		this.playerHealth = Math.max(0, this.playerHealth - amount);
		this.notifyPlayerHealthChange();
		
		// Activar invulnerabilidad temporal
		this.playerInvulnerable = true;
		this.playerInvulnerableTimer = this.playerInvulnerableDuration;
		
		if (this.playerHealth <= 0) {
			this.joystickInput = { angle: null, distance: null };
			this.setGameState("gameOver");
		}
	}

	private notifyPlayerHealthChange(): void {
		for (const listener of this.playerHealthListeners) {
			listener(this.playerHealth, this.playerMaxHealth);
		}
	}

	private notifyPowerUpEffectsChange(): void {
		const snapshot = this.getActivePowerUpsSnapshot();
		for (const listener of this.powerUpListeners) {
			listener(snapshot);
		}
	}

	private notifyGameStateChange(): void {
		for (const listener of this.gameStateListeners) {
			listener(this.currentState);
		}
	}

	private setGameState(state: GameState): void {
		if (this.currentState === state) {
			return;
		}
		this.currentState = state;
		if (state === "running") {
			this.isPlayerDefeated = false;
		}
		if (state === "gameOver") {
			this.isPlayerDefeated = true;
		}
		this.notifyGameStateChange();
	}

	private getActivePowerUpsSnapshot(): Array<{ type: PowerUpType; remaining: number }> {
		return Array.from(this.activePowerUps.entries())
			.map(([type, remaining]) => ({ type, remaining }))
			.sort((a, b) => b.remaining - a.remaining);
	}

	private spawnInitialEnemies(count: number): void {
		for (let i = 0; i < count; i++) {
			this.spawnEnemy();
		}
	}

	private spawnEnemy(): void {
		if (this.enemies.length >= this.maxEnemies) {
			return;
		}

		const anchor = this.characterAnchor;
		const playerPosition = anchor?.getAbsolutePosition() ?? Vector3.Zero();
		const spawnPosition = this.getRandomSpawnPosition(playerPosition);
		const enemyMesh = MeshBuilder.CreateSphere("sceneTwoEnemy", { diameter: 3.2 }, this.scene);
		enemyMesh.position = spawnPosition;
		enemyMesh.material = this.getEnemyMaterial();
		enemyMesh.metadata = { type: "enemy" };

		const { root: barRoot, fill: barFill, background: barBackground, width: barWidth } =
			this.createEnemyHealthBar(enemyMesh);

		const enemy: EnemyInstance = {
			mesh: enemyMesh,
			health: this.enemyMaxHealth,
			maxHealth: this.enemyMaxHealth,
			barRoot,
			barFill,
			barBackground,
			barWidth,
		};

		this.updateEnemyHealthBar(enemy);
		this.enemies.push(enemy);
	}

	private createEnemyHealthBar(mesh: Mesh): {
		root: TransformNode;
		fill: Mesh;
		background: Mesh;
		width: number;
	} {
		const barRoot = new TransformNode("sceneTwoEnemyBarRoot", this.scene);
		barRoot.parent = mesh;
		barRoot.position = new Vector3(0, 3.4, 0);

		const barWidth = 2.6;
		const barHeight = 0.32;

		const background = MeshBuilder.CreatePlane(
			"sceneTwoEnemyBarBg",
			{ width: barWidth, height: barHeight },
			this.scene
		);
		background.parent = barRoot;
		background.billboardMode = Mesh.BILLBOARDMODE_ALL;
		background.isPickable = false;
		background.material = this.getEnemyBarBackgroundMaterial();

		const fill = MeshBuilder.CreatePlane(
			"sceneTwoEnemyBarFill",
			{ width: barWidth, height: barHeight },
			this.scene
		);
		fill.parent = barRoot;
		fill.billboardMode = Mesh.BILLBOARDMODE_ALL;
		fill.position.z = 0.02;
		fill.isPickable = false;
		fill.material = this.getEnemyBarFillMaterial();

		return { root: barRoot, fill, background, width: barWidth };
	}

	private updateEnemyHealthBar(enemy: EnemyInstance): void {
		const ratio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 0;
		enemy.barFill.scaling.x = Math.max(ratio, 0.001);
		enemy.barFill.position.x = -((1 - ratio) * enemy.barWidth) / 2;
	}

	private applyDamageToEnemy(enemy: EnemyInstance, amount: number): boolean {
		enemy.health = Math.max(0, enemy.health - amount);
		this.updateEnemyHealthBar(enemy);
		if (enemy.health <= 0) {
			this.disposeEnemy(enemy);
			return true;
		}
		return false;
	}

	private disposeEnemy(enemy: EnemyInstance): void {
		if (!enemy.barFill.isDisposed()) {
			enemy.barFill.dispose();
		}
		if (!enemy.barBackground.isDisposed()) {
			enemy.barBackground.dispose();
		}
		if (!enemy.barRoot.isDisposed()) {
			enemy.barRoot.dispose();
		}
		if (!enemy.mesh.isDisposed()) {
			enemy.mesh.dispose();
		}
	}

	private clearEnemies(): void {
		for (const enemy of this.enemies) {
			this.disposeEnemy(enemy);
		}
		this.enemies.length = 0;
	}

	private clearBullets(): void {
		for (const bullet of this.bullets) {
			if (!bullet.mesh.isDisposed()) {
				bullet.mesh.dispose();
			}
		}
		this.bullets.length = 0;
	}

	private clearPowerUps(): void {
		for (const powerUp of this.powerUps) {
			if (!powerUp.mesh.isDisposed()) {
				powerUp.mesh.dispose();
			}
		}
		this.powerUps.length = 0;
	}

	private getRandomSpawnPosition(playerPosition: Vector3): Vector3 {
		const limit = this.groundSize / 2 - 12;
		for (let attempts = 0; attempts < 6; attempts++) {
			const x = (Math.random() * 2 - 1) * limit;
			const z = (Math.random() * 2 - 1) * limit;
			const candidate = new Vector3(x, 1.6, z);
			if (Vector3.DistanceSquared(candidate, playerPosition) > 400) {
				return candidate;
			}
		}
		return new Vector3(limit, 1.6, limit);
	}

	private updateEnemies(deltaTime: number): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const playerPosition = anchor.getAbsolutePosition();
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const enemy = this.enemies[i];
			const mesh = enemy.mesh;
			if (!mesh || mesh.isDisposed()) {
				this.disposeEnemy(enemy);
				this.enemies.splice(i, 1);
				continue;
			}

			const toPlayer = playerPosition.clone().subtract(mesh.position);
			toPlayer.y = 0;
			if (toPlayer.lengthSquared() > 0.01) {
				const direction = toPlayer.normalize();
				mesh.position.addInPlace(direction.scale(this.enemySpeed * deltaTime));
				mesh.position.y = 1.6;
			}

			this.clampToGround(mesh.position);
		}
	}

	private updateBullets(deltaTime: number): void {
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const bullet = this.bullets[i];
			const mesh = bullet.mesh;
			if (!mesh || mesh.isDisposed()) {
				this.bullets.splice(i, 1);
				continue;
			}

			mesh.position.addInPlace(bullet.direction.scale(this.bulletSpeed * deltaTime));
			mesh.position.y = 1.6;
			bullet.life -= deltaTime;

			if (bullet.life <= 0 || !this.isWithinBounds(mesh.position)) {
				mesh.dispose();
				this.bullets.splice(i, 1);
			}
		}
	}

	private spawnPowerUp(): void {
		if (this.currentState !== "running") {
			return;
		}

		const anchor = this.characterAnchor;
		const playerPosition = anchor?.getAbsolutePosition() ?? Vector3.Zero();
		const spawnPosition = this.getRandomSpawnPosition(playerPosition);
		const types: PowerUpType[] = ["health", "speed", "rapidFire"];
		const type = types[Math.floor(Math.random() * types.length)];
		const mesh = this.createPowerUpMesh(type);
		mesh.position = spawnPosition.clone();
		mesh.position.y = 1.4;
		mesh.metadata = { type: "powerUp", powerUpType: type };

		const powerUp: PowerUpInstance = {
			mesh,
			type,
			lifetime: this.powerUpLifetime,
			rotationSpeed: this.powerUpRotationSpeed * (0.8 + Math.random() * 0.4),
			bobPhase: Math.random() * Math.PI * 2,
		};

		this.powerUps.push(powerUp);
	}

	private createPowerUpMesh(type: PowerUpType): Mesh {
		const mesh = MeshBuilder.CreateCylinder(
			`sceneTwoPowerUp_${type}_${Date.now()}`,
			{ height: 1.2, diameter: 1.2, tessellation: 12 },
			this.scene
		);
		mesh.isPickable = false;
		mesh.material = this.getPowerUpMaterial(type);
		return mesh;
	}

	private updatePowerUps(deltaTime: number): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const playerPosition = anchor.getAbsolutePosition();
		for (let i = this.powerUps.length - 1; i >= 0; i--) {
			const powerUp = this.powerUps[i];
			const mesh = powerUp.mesh;
			if (!mesh || mesh.isDisposed()) {
				this.powerUps.splice(i, 1);
				continue;
			}

			mesh.rotate(Vector3.Up(), powerUp.rotationSpeed * deltaTime);
			powerUp.bobPhase += deltaTime;
			mesh.position.y = 1.2 + Math.sin(powerUp.bobPhase * 2) * (this.powerUpBobHeight / 2) + this.powerUpBobHeight / 2;

			powerUp.lifetime -= deltaTime;
			if (powerUp.lifetime <= 0) {
				mesh.dispose();
				this.powerUps.splice(i, 1);
				continue;
			}

			if (Vector3.DistanceSquared(mesh.position, playerPosition) <= 6.25) {
				mesh.dispose();
				this.powerUps.splice(i, 1);
				this.applyPowerUp(powerUp.type);
			}
		}
	}

	private applyPowerUp(type: PowerUpType): void {
		switch (type) {
			case "health":
				this.playerHealth = Math.min(
					this.playerMaxHealth,
					this.playerHealth + this.powerUpHealthAmount
				);
				this.notifyPlayerHealthChange();
				break;
			case "speed":
				this.activePowerUps.set(
					"speed",
					Math.max(this.activePowerUps.get("speed") ?? 0, this.speedBoostDuration)
				);
				this.refreshPowerUpModifiers();
				break;
			case "rapidFire":
				this.activePowerUps.set(
					"rapidFire",
					Math.max(this.activePowerUps.get("rapidFire") ?? 0, this.rapidFireDuration)
				);
				this.refreshPowerUpModifiers();
				break;
		}

		this.notifyPowerUpEffectsChange();
	}

	private updateActiveEffects(deltaTime: number): void {
		if (this.activePowerUps.size === 0) {
			return;
		}

		let changed = false;
		const expired: PowerUpType[] = [];
		for (const [type, remaining] of this.activePowerUps.entries()) {
			const nextRemaining = remaining - deltaTime;
			if (nextRemaining <= 0) {
				expired.push(type);
				changed = true;
			} else {
				this.activePowerUps.set(type, nextRemaining);
				if (Math.abs(nextRemaining - remaining) > Number.EPSILON) {
					changed = true;
				}
			}
		}

		for (const type of expired) {
			this.activePowerUps.delete(type);
		}

		if (changed) {
			this.refreshPowerUpModifiers();
			this.notifyPowerUpEffectsChange();
		}
	}

	private refreshPowerUpModifiers(): void {
		this.movementSpeedMultiplier = this.activePowerUps.has("speed") ? this.speedBoostMultiplier : 1;
		this.currentShootInterval = this.activePowerUps.has("rapidFire")
			? this.rapidFireInterval
			: this.baseShootInterval;
		this.shootCooldown = Math.min(this.shootCooldown, this.currentShootInterval);
	}

	private updateInvulnerability(deltaTime: number): void {
		if (this.playerInvulnerable) {
			this.playerInvulnerableTimer -= deltaTime;
			if (this.playerInvulnerableTimer <= 0) {
				this.playerInvulnerable = false;
				this.playerInvulnerableTimer = 0;
				// Restaurar visibilidad completa del personaje
				if (this.characterAnchor) {
					this.characterAnchor.getChildMeshes().forEach(mesh => {
						mesh.visibility = 1;
					});
				}
			} else {
				// Efecto de parpadeo mientras está invulnerable
				if (this.characterAnchor) {
					const blinkSpeed = 8; // Velocidad del parpadeo
					const visibility = Math.sin(this.playerInvulnerableTimer * blinkSpeed * Math.PI) > 0 ? 0.3 : 1;
					this.characterAnchor.getChildMeshes().forEach(mesh => {
						mesh.visibility = visibility;
					});
				}
			}
		}
	}

	private handleEnemyCollisions(): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const playerPosition = anchor.getAbsolutePosition();
		for (let i = this.enemies.length - 1; i >= 0; i--) {
			const enemy = this.enemies[i];
			const enemyMesh = enemy.mesh;
			if (!enemyMesh || enemyMesh.isDisposed()) {
				this.disposeEnemy(enemy);
				this.enemies.splice(i, 1);
				continue;
			}

			let enemyRemoved = false;
			for (let j = this.bullets.length - 1; j >= 0; j--) {
				const bullet = this.bullets[j];
				const bulletMesh = bullet.mesh;
				if (!bulletMesh || bulletMesh.isDisposed()) {
					this.bullets.splice(j, 1);
					continue;
				}

				if (Vector3.DistanceSquared(enemyMesh.position, bulletMesh.position) <= 9) {
					bulletMesh.dispose();
					this.bullets.splice(j, 1);
					enemyRemoved = this.applyDamageToEnemy(enemy, this.bulletDamage);
					if (enemyRemoved) {
						this.enemies.splice(i, 1);
					}
					break;
				}
			}

			if (enemyRemoved) {
				continue;
			}

			if (Vector3.DistanceSquared(enemyMesh.position, playerPosition) <= 9) {
				this.damagePlayer(this.playerCollisionDamage);
				this.disposeEnemy(enemy);
				this.enemies.splice(i, 1);
				this.spawnEnemy();
			}
		}
	}

	public shoot(): void {
		if (this.shootCooldown > 0 || this.isPlayerDefeated || this.currentState !== "running") {
			return;
		}

		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const direction = this.lastMovementDirection.lengthSquared() > 0.01
			? this.lastMovementDirection.clone()
			: this.camera.getDirection(Vector3.Forward()).normalize();
		direction.y = 0;
		if (direction.lengthSquared() === 0) {
			direction.z = 1;
		}
		direction.normalize();

		this.createBullet(direction);
		this.shootCooldown = this.currentShootInterval;
	}

	private autoShoot(): void {
		// Método para disparo automático sin verificar cooldown
		if (this.isPlayerDefeated || this.currentState !== "running") {
			return;
		}

		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const direction = this.lastMovementDirection.lengthSquared() > 0.01
			? this.lastMovementDirection.clone()
			: this.camera.getDirection(Vector3.Forward()).normalize();
		direction.y = 0;
		if (direction.lengthSquared() === 0) {
			direction.z = 1;
		}
		direction.normalize();

		this.createBullet(direction);
	}

	private createBullet(direction: Vector3): void {
		const anchor = this.characterAnchor;
		if (!anchor) {
			return;
		}

		const bullet = MeshBuilder.CreateSphere("sceneTwoBullet", { diameter: 1 }, this.scene);
		bullet.position = anchor.getAbsolutePosition().clone();
		bullet.position.y = 1.6;
		bullet.material = this.getBulletMaterial();

		this.bullets.push({ mesh: bullet, direction: direction.clone(), life: this.bulletLifetime });
	}

	public pause(): void {
		if (this.currentState !== "running") {
			return;
		}
		this.joystickInput = { angle: null, distance: null };
		this.lastCharacterPosition = null;
		this.setGameState("paused");
	}

	public resume(): void {
		if (this.currentState !== "paused") {
			return;
		}
		this.setGameState("running");
	}

	public togglePause(): void {
		if (this.currentState === "paused") {
			this.resume();
		} else if (this.currentState === "running") {
			this.pause();
		}
	}

	public resetGame(): void {
		if (!this.characterAnchor) {
			return;
		}

		this.clearEnemies();
		this.clearBullets();
		this.clearPowerUps();
		this.activePowerUps.clear();
		this.refreshPowerUpModifiers();
		this.notifyPowerUpEffectsChange();

		this.playerHealth = this.playerMaxHealth;
		this.notifyPlayerHealthChange();
		this.isPlayerDefeated = false;
		this.playerInvulnerable = false;
		this.playerInvulnerableTimer = 0;
		this.shootCooldown = 0;
		this.autoFireTimer = 0;
		this.enemySpawnTimer = 0;
		this.powerUpSpawnTimer = 0;
		this.joystickInput = { angle: null, distance: null };
		this.lastCharacterPosition = null;
		this.lastMovementDirection = new Vector3(0, 0, 1);

		const anchor = this.characterAnchor;
		anchor.position.copyFromFloats(0, 0, 0);
		anchor.rotationQuaternion = Quaternion.Identity();
		this.camera.target = anchor.getAbsolutePosition();

		this.spawnInitialEnemies(3);
		this.setGameState("running");
	}

	private clampToGround(position: Vector3): void {
		const limit = this.groundSize / 2 - 6;
		position.x = Math.min(limit, Math.max(-limit, position.x));
		position.z = Math.min(limit, Math.max(-limit, position.z));
	}

	private isWithinBounds(position: Vector3): boolean {
		const limit = this.groundSize / 2 - 6;
		return Math.abs(position.x) <= limit && Math.abs(position.z) <= limit;
	}

	private getEnemyMaterial(): StandardMaterial {
		if (!this.enemyMaterial) {
			this.enemyMaterial = new StandardMaterial("sceneTwoEnemyMaterial", this.scene);
			this.enemyMaterial.diffuseColor = new Color3(0.9, 0.2, 0.2);
			this.enemyMaterial.specularColor = new Color3(0, 0, 0); // Sin especular
			this.enemyMaterial.emissiveColor = new Color3(0, 0, 0); // Sin emisivo
		}
		return this.enemyMaterial;
	}

	private getBulletMaterial(): StandardMaterial {
		if (!this.bulletMaterial) {
			this.bulletMaterial = new StandardMaterial("sceneTwoBulletMaterial", this.scene);
			this.bulletMaterial.diffuseColor = new Color3(1, 0.85, 0.3);
			this.bulletMaterial.specularColor = new Color3(0, 0, 0); // Sin especular
			this.bulletMaterial.emissiveColor = new Color3(0.2, 0.17, 0.06); // Pequeño brillo para visibilidad
		}
		return this.bulletMaterial;
	}

	private getPowerUpMaterial(type: PowerUpType): StandardMaterial {
		let material = this.powerUpMaterials.get(type);
		if (!material) {
			material = new StandardMaterial(`sceneTwoPowerUpMaterial_${type}`, this.scene);
			material.specularColor = new Color3(0, 0, 0); // Sin especular para mejor rendimiento
			
			switch (type) {
				case "health":
					material.diffuseColor = new Color3(0.9, 0.2, 0.4);
					material.emissiveColor = new Color3(0.18, 0.04, 0.08); // Emisivo reducido
					break;
				case "speed":
					material.diffuseColor = new Color3(0.25, 0.75, 1);
					material.emissiveColor = new Color3(0.05, 0.15, 0.2); // Emisivo reducido
					break;
				case "rapidFire":
					material.diffuseColor = new Color3(1, 0.78, 0.25);
					material.emissiveColor = new Color3(0.2, 0.156, 0.05); // Emisivo reducido
					break;
			}
			this.powerUpMaterials.set(type, material);
		}
		return material;
	}

	private getEnemyBarBackgroundMaterial(): StandardMaterial {
		if (!this.enemyBarBackgroundMaterial) {
			this.enemyBarBackgroundMaterial = new StandardMaterial(
				"sceneTwoEnemyBarBgMaterial",
				this.scene
			);
			this.enemyBarBackgroundMaterial.diffuseColor = new Color3(0.08, 0.08, 0.12);
			this.enemyBarBackgroundMaterial.specularColor = new Color3(0, 0, 0); // Sin especular
			this.enemyBarBackgroundMaterial.emissiveColor = new Color3(0, 0, 0); // Sin emisivo
			this.enemyBarBackgroundMaterial.alpha = 0.75;
		}
		return this.enemyBarBackgroundMaterial;
	}

	private getEnemyBarFillMaterial(): StandardMaterial {
		if (!this.enemyBarFillMaterial) {
			this.enemyBarFillMaterial = new StandardMaterial(
				"sceneTwoEnemyBarFillMaterial",
				this.scene
			);
			this.enemyBarFillMaterial.diffuseColor = new Color3(0.3, 0.95, 0.45);
			this.enemyBarFillMaterial.specularColor = new Color3(0, 0, 0); // Sin especular
			this.enemyBarFillMaterial.emissiveColor = new Color3(0.06, 0.19, 0.09); // Emisivo reducido
		}
		return this.enemyBarFillMaterial;
	}

	ChangeAccessory(accessoryKey: string): void {
		console.warn(
			`[BabylonSceneTwo] ChangeAccessory(${accessoryKey}) is not implemented in the basic scene.`
		);
	}

	enableScaling(): void {
		console.warn("[BabylonSceneTwo] enableScaling is not part of the basic scene setup.");
	}

	enablePosition(): void {
		console.warn("[BabylonSceneTwo] enablePosition is not part of the basic scene setup.");
	}

	async changeCamera(): Promise<void> {
		console.warn("[BabylonSceneTwo] changeCamera is disabled to preserve isometric view.");
	}

	dispose(): void {
		// Reactivar la detección de cambios de Angular antes de destruir
		this.stopAngularOptimization();
		
		window.removeEventListener("resize", this.handleResize);
		for (const enemy of this.enemies) {
			this.disposeEnemy(enemy);
		}
		this.enemies.length = 0;
		for (const bullet of this.bullets) {
			bullet.mesh.dispose();
		}
		this.bullets.length = 0;
		for (const powerUp of this.powerUps) {
			if (!powerUp.mesh.isDisposed()) {
				powerUp.mesh.dispose();
			}
		}
		this.powerUps.length = 0;
		this.enemyMaterial?.dispose();
		this.bulletMaterial?.dispose();
		this.enemyBarBackgroundMaterial?.dispose();
		this.enemyBarFillMaterial?.dispose();
		for (const material of this.powerUpMaterials.values()) {
			material.dispose();
		}
		this.powerUpMaterials.clear();
		this.playerHealthListeners.length = 0;
		this.powerUpListeners.length = 0;
		this.activePowerUps.clear();
		this.scene.dispose();
		this.engine.dispose();
	}

	// Método público para finalizar la optimización de Angular
	public stopAngularOptimization(): void {
		if (this.home && typeof this.home.stopGameOptimization === 'function') {
			this.home.stopGameOptimization();
		}
	}
}
