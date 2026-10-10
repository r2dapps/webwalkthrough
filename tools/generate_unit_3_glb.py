"""
CAD-Accurate 3D GLB Generator for Unit 3 (1BHK Executive Suite with Balcony)
Extracted directly from Studio D+B Architectural Drawings (05-10-2026).
Architectural Color Codes & Materials: Japandi / Contemporary Luxury.
"""
import os
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

def create_box(extents, position, material, name):
    mesh = trimesh.creation.box(extents=extents)
    mesh.apply_translation(position)
    mesh.unmerge_vertices()
    normals = mesh.vertex_normals
    uv = np.zeros((len(mesh.vertices), 2), dtype=np.float32)
    for i, (v, n) in enumerate(zip(mesh.vertices, normals)):
        nx, ny, nz = abs(n[0]), abs(n[1]), abs(n[2])
        if ny >= nx and ny >= nz:
            uv[i] = [v[0], v[2]]
        elif nx >= nz:
            uv[i] = [v[2], v[1]]
        else:
            uv[i] = [v[0], v[1]]
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)
    return mesh, name

def create_cylinder(radius, height, position, material, name, sections=24):
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    mesh.apply_translation(position)
    mesh.unmerge_vertices()
    normals = mesh.vertex_normals
    uv = np.zeros((len(mesh.vertices), 2), dtype=np.float32)
    for i, (v, n) in enumerate(zip(mesh.vertices, normals)):
        if abs(n[1]) >= 0.8:
            uv[i] = [v[0], v[2]]
        else:
            uv[i] = [np.arctan2(n[2], n[0]) / (2 * np.pi) + 0.5, v[1]]
    mesh.visual = trimesh.visual.TextureVisuals(uv=uv, material=material)
    return mesh, name

def run():
    scene = trimesh.Scene()

    # =========================================================================
    # ARCHITECTURAL PBR LUXURY JAPANDI / CONTEMPORARY PALETTE
    # (Authentic Architectural Color Codes: Sherwin-Williams & Benjamin Moore Inspired)
    # =========================================================================
    # 1. Main Perimeter Walls: Warm Cashmere Plaster (authentic Swiss Coffee / Alabaster warmth, LRV ~62%)
    mat_wall = PBRMaterial(name="Mat_Wall", baseColorFactor=[0.66, 0.62, 0.56, 1.0], roughnessFactor=0.88, metallicFactor=0.01)
    # 2. Living & Bedroom Feature Accent Walls: Nordic Forest Sage Olive (moody, deep architectural warmth)
    mat_wall_accent = PBRMaterial(name="Mat_Wall_Accent", baseColorFactor=[0.20, 0.30, 0.22, 1.0], roughnessFactor=0.80, metallicFactor=0.02)
    # 3. Acoustic Slat Panelling: Warm Natural European Oak
    mat_slat_wood = PBRMaterial(name="Mat_Slat_Wood", baseColorFactor=[0.58, 0.38, 0.20, 1.0], roughnessFactor=0.48, metallicFactor=0.02)
    # 4. Slat Panelling Backing: Deep Acoustic Charcoal Felt
    mat_slat_back = PBRMaterial(name="Mat_Slat_Back", baseColorFactor=[0.10, 0.10, 0.11, 1.0], roughnessFactor=0.95, metallicFactor=0.0)
    # 5. Skirting & Trims: Architectural Dark Smoked Bronze / Walnut Shadow Reveal
    mat_skirting = PBRMaterial(name="Mat_Skirting", baseColorFactor=[0.16, 0.11, 0.08, 1.0], roughnessFactor=0.45, metallicFactor=0.05)
    # 6. Area Rugs: Woven Oatmeal Berber Wool (textured warm grey/oat tonality)
    mat_rug_living = PBRMaterial(name="Mat_Rug_Living", baseColorFactor=[0.62, 0.56, 0.48, 1.0], roughnessFactor=0.96, metallicFactor=0.0)
    mat_rug_dining = PBRMaterial(name="Mat_Rug_Dining", baseColorFactor=[0.52, 0.46, 0.38, 1.0], roughnessFactor=0.96, metallicFactor=0.0)
    mat_rug_bed = PBRMaterial(name="Mat_Rug_Bed", baseColorFactor=[0.60, 0.54, 0.46, 1.0], roughnessFactor=0.96, metallicFactor=0.0)
    # 7. Floors: Smoked Amber French Oak (rich, warm, golden amber tonality)
    mat_parquet = PBRMaterial(name="Mat_Floor_Parquet", baseColorFactor=[0.55, 0.35, 0.19, 1.0], roughnessFactor=0.40, metallicFactor=0.04)
    # 8. Balcony Floor: Non-slip Natural Terracotta / Sandstone Pavers
    mat_balcony_floor = PBRMaterial(name="Mat_Floor_Balcony", baseColorFactor=[0.50, 0.36, 0.26, 1.0], roughnessFactor=0.75, metallicFactor=0.02)
    # 9. Kitchen & Bathroom Floor: Grigio Basalt Stone / Honed Ceppo Tile
    mat_tiles = PBRMaterial(name="Mat_Floor_Tiles", baseColorFactor=[0.32, 0.30, 0.28, 1.0], roughnessFactor=0.30, metallicFactor=0.06)
    # 10. Ceilings: Warm Architectural Chalk White
    mat_ceiling = PBRMaterial(name="Mat_Ceiling", baseColorFactor=[0.90, 0.88, 0.86, 1.0], roughnessFactor=0.92, metallicFactor=0.0)
    # 11. Glass: Ultra-clear architectural glazing
    mat_glass = PBRMaterial(name="Mat_Glass", baseColorFactor=[0.88, 0.94, 0.98, 0.22], roughnessFactor=0.03, metallicFactor=0.05)
    # 12. Metal: Architectural Matte Obsidian Black Steel
    mat_black_metal = PBRMaterial(name="Mat_Metal_Black", baseColorFactor=[0.08, 0.08, 0.09, 1.0], roughnessFactor=0.35, metallicFactor=0.85)
    # 13. Wood: Smoked American Walnut Slab
    mat_walnut = PBRMaterial(name="Mat_Wood_Walnut", baseColorFactor=[0.24, 0.14, 0.08, 1.0], roughnessFactor=0.38, metallicFactor=0.03)
    # 14. Doors: Natural White Oak Joinery
    mat_doors = PBRMaterial(name="Mat_Wood_Doors", baseColorFactor=[0.48, 0.32, 0.18, 1.0], roughnessFactor=0.44, metallicFactor=0.02)
    # 15. Dining Chairs & Lounge: Deep Cognac Tan Italian Saddle Leather
    mat_chair_fabric = PBRMaterial(name="Mat_Chair_Fabric", baseColorFactor=[0.44, 0.18, 0.06, 1.0], roughnessFactor=0.62, metallicFactor=0.01)
    # 16. Sofa Fabric: Charcoal Forest Wool Tweed
    mat_sofa_fabric = PBRMaterial(name="Mat_Fabric_Sofa", baseColorFactor=[0.16, 0.20, 0.18, 1.0], roughnessFactor=0.88, metallicFactor=0.01)
    # 17. Sofa Cushions & Pillows: Rich Burnt Ochre Velvet & Forest Sage
    mat_sofa_cushion = PBRMaterial(name="Mat_Fabric_Cushion", baseColorFactor=[0.66, 0.40, 0.12, 1.0], roughnessFactor=0.75, metallicFactor=0.01)
    mat_cushion_sage = PBRMaterial(name="Mat_Fabric_Sage", baseColorFactor=[0.22, 0.32, 0.22, 1.0], roughnessFactor=0.80, metallicFactor=0.01)
    # 18. Bed Suite: Luxury Egyptian Cotton Linen & Deep Terracotta Rust Throw
    mat_bed_linen = PBRMaterial(name="Mat_Bed_Linen", baseColorFactor=[0.88, 0.86, 0.82, 1.0], roughnessFactor=0.90, metallicFactor=0.01)
    mat_bed_throw = PBRMaterial(name="Mat_Bed_Throw", baseColorFactor=[0.48, 0.16, 0.08, 1.0], roughnessFactor=0.85, metallicFactor=0.01)
    # 19. Modular Kitchen Upper Cabinets: Cashmere Sand
    mat_upper_cab = PBRMaterial(name="Mat_Upper_Cab", baseColorFactor=[0.65, 0.60, 0.52, 1.0], roughnessFactor=0.45, metallicFactor=0.02)
    # 20. Appliances: Brushed Stainless Steel
    mat_appliance = PBRMaterial(name="Mat_Appliance", baseColorFactor=[0.60, 0.62, 0.65, 1.0], roughnessFactor=0.22, metallicFactor=0.92)
    # 21. Marble: Polished Calacatta Gold Marble
    mat_marble = PBRMaterial(name="Mat_Marble", baseColorFactor=[0.92, 0.90, 0.86, 1.0], roughnessFactor=0.14, metallicFactor=0.04)
    # 22. Metals: Warm Brushed Champagne Brass
    mat_brass = PBRMaterial(name="Mat_Brass", baseColorFactor=[0.82, 0.68, 0.36, 1.0], roughnessFactor=0.28, metallicFactor=0.88)
    # 23. Ceramic: Glazed White Ceramic
    mat_ceramic = PBRMaterial(name="Mat_Ceramic", baseColorFactor=[0.94, 0.94, 0.94, 1.0], roughnessFactor=0.10, metallicFactor=0.05)
    # 24. Exterior Ground: Lush Landscape Garden Turf
    mat_exterior_ground = PBRMaterial(name="Mat_Exterior_Ground", baseColorFactor=[0.18, 0.30, 0.14, 1.0], roughnessFactor=0.88, metallicFactor=0.02)
    # 25. Balcony Planters & Tropical Greenery
    mat_plant_green = PBRMaterial(name="Mat_Plant_Green", baseColorFactor=[0.12, 0.30, 0.10, 1.0], roughnessFactor=0.65, metallicFactor=0.01)
    mat_planter_pot = PBRMaterial(name="Mat_Planter_Pot", baseColorFactor=[0.48, 0.24, 0.14, 1.0], roughnessFactor=0.75, metallicFactor=0.02)
    # 26. Wall Art Canvas
    mat_art_canvas = PBRMaterial(name="Mat_Art_Canvas", baseColorFactor=[0.40, 0.48, 0.44, 1.0], roughnessFactor=0.70, metallicFactor=0.02)

    geometries = []

    # --- ARCHITECTURAL DIMENSIONS (in meters) ---
    H_WALL = 2.85
    T_WALL_EXT = 0.23 # 9" outer wall
    T_WALL_INT = 0.12 # 4.5" inner partition
    H_DOOR = 2.10

    # 1. FLOORS
    # Living & Dining Floor (Oak Parquet)
    m, n = create_box([8.4, 0.1, 2.4], [4.2, -0.05, 1.2], mat_parquet, "Floor_LivingDining")
    geometries.append((m, n))

    # Master Bedroom Floor (Oak Parquet)
    m, n = create_box([4.1, 0.1, 2.7], [2.05, -0.05, 3.75], mat_parquet, "Floor_Bedroom")
    geometries.append((m, n))

    # Balcony Floor (Exterior non-slip terracotta/stone: 16'-9" x 4'-6")
    m, n = create_box([1.4, 0.1, 5.1], [9.3, -0.05, 2.55], mat_balcony_floor, "Floor_Balcony")
    geometries.append((m, n))

    # Outdoor ground plane outside building (Lowered for upper floor balcony view)
    m, n = create_box([40.0, 0.2, 40.0], [12.0, -3.2, 2.5], mat_exterior_ground, "Floor_OutdoorGround")
    geometries.append((m, n))

    # Kitchen Floor (Porcelain Tiles)
    m, n = create_box([2.4, 0.1, 2.7], [7.2, -0.05, 3.75], mat_tiles, "Floor_Kitchen")
    geometries.append((m, n))

    # Bathroom & Shaft Floor (Stone Tiles)
    m, n = create_box([1.9, 0.1, 2.7], [5.05, -0.05, 3.75], mat_tiles, "Floor_Bathroom")
    geometries.append((m, n))

    # 1B. ARCHITECTURAL AREA RUGS (Elevated 12mm above parquet to eliminate Z-fighting)
    m, n = create_box([2.80, 0.012, 1.80], [2.70, 0.012, 1.25], mat_rug_living, "Rug_Living")
    geometries.append((m, n))
    m, n = create_box([2.20, 0.012, 1.60], [6.40, 0.012, 1.15], mat_rug_dining, "Rug_Dining")
    geometries.append((m, n))
    m, n = create_box([2.40, 0.012, 1.80], [2.20, 0.012, 3.80], mat_rug_bed, "Rug_Bedroom")
    geometries.append((m, n))

    # 2. CEILINGS
    m, n = create_box([8.4, 0.15, 5.1], [4.2, H_WALL + 0.075, 2.55], mat_ceiling, "Ceiling_Main")
    geometries.append((m, n))
    m, n = create_box([1.4, 0.15, 5.1], [9.3, H_WALL + 0.075, 2.55], mat_ceiling, "Ceiling_Balcony")
    geometries.append((m, n))

    # 3. EXTERIOR WALLS
    # North Outer Wall (Z = 0.0)
    m, n = create_box([10.23, H_WALL, T_WALL_EXT], [4.885, H_WALL/2, -T_WALL_EXT/2], mat_wall, "Wall_North_Ext")
    geometries.append((m, n))
    # Skirting along North wall
    m, n = create_box([8.4, 0.09, 0.02], [4.2, 0.045, 0.01], mat_skirting, "Skirting_North_Living")
    geometries.append((m, n))

    # North Wall Acoustic Oak Slat Panelling feature behind sofa (X = 1.60 to 3.80)
    m, n = create_box([2.20, 2.40, 0.02], [2.70, 1.20, 0.01], mat_slat_back, "Panelling_Sofa_Back")
    geometries.append((m, n))
    # Vertical Oak Slats
    for sx in np.linspace(1.65, 3.75, 22):
        m, n = create_box([0.05, 2.40, 0.015], [sx, 1.20, 0.025], mat_slat_wood, f"Slat_Sofa_{sx:.2f}")
        geometries.append((m, n))

    # Architectural Framed Art above sofa
    m, n = create_box([1.20, 0.70, 0.02], [2.70, 1.85, 0.04], mat_walnut, "Art_Frame_Living")
    geometries.append((m, n))
    m, n = create_box([1.12, 0.62, 0.01], [2.70, 1.85, 0.055], mat_art_canvas, "Art_Canvas_Living")
    geometries.append((m, n))

    # South Outer Wall (Z = 5.10)
    m, n = create_box([10.23, H_WALL, T_WALL_EXT], [4.885, H_WALL/2, 5.10 + T_WALL_EXT/2], mat_wall, "Wall_South_Ext")
    geometries.append((m, n))
    m, n = create_box([4.1, 0.09, 0.02], [2.05, 0.045, 5.09], mat_skirting, "Skirting_South_Bed")
    geometries.append((m, n))

    # West Outer Wall (Corridor boundary, X = 0.0)
    m, n = create_box([T_WALL_EXT, H_WALL, 0.30], [-T_WALL_EXT/2, H_WALL/2, 0.15], mat_wall, "Wall_West_EntryP1")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL - H_DOOR, 0.95], [-T_WALL_EXT/2, H_DOOR + (H_WALL-H_DOOR)/2, 0.775], mat_wall, "Wall_West_EntryLintel")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL, 1.95], [-T_WALL_EXT/2, H_WALL/2, 2.225], mat_wall, "Wall_West_Pier2")
    geometries.append((m, n))

    # Bedroom Window Opening on West Wall (towards external shaft)
    m, n = create_box([T_WALL_EXT, 0.90, 1.20], [-T_WALL_EXT/2, 0.45, 3.80], mat_wall, "Wall_West_WinSill")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL - H_DOOR, 1.20], [-T_WALL_EXT/2, H_DOOR + (H_WALL-H_DOOR)/2, 3.80], mat_wall, "Wall_West_WinLintel")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL, 0.70], [-T_WALL_EXT/2, H_WALL/2, 4.75], mat_wall, "Wall_West_Pier3")
    geometries.append((m, n))

    # East Wall (Separating Living/Kitchen from Balcony at X = 8.40)
    m, n = create_box([T_WALL_EXT, H_WALL - 2.40, 5.10], [8.40 + T_WALL_EXT/2, 2.40 + (H_WALL-2.40)/2, 2.55], mat_wall, "Wall_East_BalconyLintel")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL, 0.30], [8.40 + T_WALL_EXT/2, H_WALL/2, 0.15], mat_wall, "Col_East_North")
    geometries.append((m, n))
    m, n = create_box([T_WALL_EXT, H_WALL, 0.30], [8.40 + T_WALL_EXT/2, H_WALL/2, 4.95], mat_wall, "Col_East_South")
    geometries.append((m, n))

    # 4. INTERIOR PARTITION WALLS
    # Living/Bedroom divider (Z = 2.40)
    m, n = create_box([3.20, H_WALL, T_WALL_INT], [1.60, H_WALL/2, 2.40 - T_WALL_INT/2], mat_wall, "Wall_Living_Bed")
    geometries.append((m, n))

    # TV Feature Panel in Nordic Sage Olive (X = 1.00 to 3.10)
    m, n = create_box([2.10, 2.30, 0.02], [2.05, 1.25, 2.40 - T_WALL_INT - 0.01], mat_wall_accent, "Wall_TV_FeaturePanel")
    geometries.append((m, n))
    # Fluted Oak detail strip behind TV
    m, n = create_box([0.50, 2.30, 0.025], [1.30, 1.25, 2.40 - T_WALL_INT - 0.012], mat_slat_wood, "Wall_TV_WoodStrip")
    geometries.append((m, n))

    # Bedroom Door Lintel (X = 3.20 to 4.10)
    m, n = create_box([0.90, H_WALL - H_DOOR, T_WALL_INT], [3.65, H_DOOR + (H_WALL-H_DOOR)/2, 2.40 - T_WALL_INT/2], mat_wall, "Wall_BedDoorLintel")
    geometries.append((m, n))
    # Wall between Bedroom door and Toilet door (X = 4.10 to 5.10)
    m, n = create_box([1.00, H_WALL, T_WALL_INT], [4.60, H_WALL/2, 2.40 - T_WALL_INT/2], mat_wall, "Wall_Mid_Lobby")
    geometries.append((m, n))
    # Toilet Door Lintel (X = 5.10 to 5.95)
    m, n = create_box([0.85, H_WALL - H_DOOR, T_WALL_INT], [5.525, H_DOOR + (H_WALL-H_DOOR)/2, 2.40 - T_WALL_INT/2], mat_wall, "Wall_ToiletDoorLintel")
    geometries.append((m, n))
    # Kitchen / Dining open portal pier (X = 5.95 to 6.20)
    m, n = create_box([0.25, H_WALL, T_WALL_INT], [6.075, H_WALL/2, 2.40 - T_WALL_INT/2], mat_wall, "Wall_Kitchen_Pier")
    geometries.append((m, n))
    # Kitchen / Dining header beam (X = 6.20 to 8.40)
    m, n = create_box([2.20, H_WALL - 2.40, T_WALL_INT], [7.30, 2.40 + (H_WALL-2.40)/2, 2.40 - T_WALL_INT/2], mat_wall, "Beam_Kitchen_Header")
    geometries.append((m, n))

    # Partition between Bedroom and Toilet (X = 4.10, Z = 2.40 to 5.10)
    m, n = create_box([T_WALL_INT, H_WALL, 2.70], [4.10 + T_WALL_INT/2, H_WALL/2, 3.75], mat_wall, "Wall_Bed_Toilet")
    geometries.append((m, n))

    # Partition between Toilet and Kitchen (X = 5.95, Z = 2.40 to 5.10)
    m, n = create_box([T_WALL_INT, H_WALL, 2.70], [5.95 - T_WALL_INT/2, H_WALL/2, 3.75], mat_wall, "Wall_Toilet_Kitchen")
    geometries.append((m, n))
    # Shaft internal wall divider (Z = 4.40, X = 4.10 to 5.95)
    m, n = create_box([1.85, H_WALL, T_WALL_INT], [5.025, H_WALL/2, 4.40], mat_wall, "Wall_Shaft_Divider")
    geometries.append((m, n))

    # 5. BALCONY ELEMENTS (Glass Balustrade & Glazing)
    m, n = create_box([0.02, 1.00, 5.10], [9.98, 0.55, 2.55], mat_glass, "Balcony_Rail_GlassEast")
    geometries.append((m, n))
    m, n = create_box([0.06, 0.06, 5.10], [9.98, 1.08, 2.55], mat_black_metal, "Balcony_HandrailEast")
    geometries.append((m, n))
    m, n = create_box([1.40, 1.00, 0.02], [9.30, 0.55, 0.02], mat_glass, "Balcony_Rail_GlassNorth")
    geometries.append((m, n))
    m, n = create_box([1.40, 0.06, 0.06], [9.30, 1.08, 0.02], mat_black_metal, "Balcony_HandrailNorth")
    geometries.append((m, n))
    m, n = create_box([1.40, 1.00, 0.02], [9.30, 0.55, 5.08], mat_glass, "Balcony_Rail_GlassSouth")
    geometries.append((m, n))
    m, n = create_box([1.40, 0.06, 0.06], [9.30, 1.08, 5.08], mat_black_metal, "Balcony_HandrailSouth")
    geometries.append((m, n))

    # Balcony Planter Boxes with Lush Architectural Plants (Visible from Living & Dining)
    m, n = create_box([0.35, 0.45, 1.20], [9.65, 0.225, 0.70], mat_planter_pot, "Planter_Box_N")
    geometries.append((m, n))
    m, n = create_box([0.30, 0.60, 1.15], [9.65, 0.70, 0.70], mat_plant_green, "Planter_Plant_N")
    geometries.append((m, n))

    m, n = create_box([0.35, 0.45, 1.20], [9.65, 0.225, 4.40], mat_planter_pot, "Planter_Box_S")
    geometries.append((m, n))
    m, n = create_box([0.30, 0.60, 1.15], [9.65, 0.70, 4.40], mat_plant_green, "Planter_Plant_S")
    geometries.append((m, n))

    # 2-Panel Architectural Sliding Balcony System (Floor to 2.4m, X = 8.42)
    m, n = create_box([0.08, 2.40, 0.08], [8.42, 1.20, 0.35], mat_black_metal, "Balcony_Frame_L")
    geometries.append((m, n))
    m, n = create_box([0.08, 2.40, 0.08], [8.42, 1.20, 4.75], mat_black_metal, "Balcony_Frame_R")
    geometries.append((m, n))
    m, n = create_box([0.08, 0.08, 4.48], [8.42, 2.36, 2.55], mat_black_metal, "Balcony_Frame_Top")
    geometries.append((m, n))
    m, n = create_box([0.08, 0.04, 4.48], [8.42, 0.02, 2.55], mat_black_metal, "Balcony_Frame_BottomTrack")
    geometries.append((m, n))

    # Panel 1: Active Sliding North Sash (Dining Access: Closed: Z = 0.35 to 2.55; Open: slides south behind Panel 2)
    m, n = create_box([0.025, 2.32, 2.22], [8.40, 1.18, 1.45], mat_glass, "Balcony_Slider_Glass")
    geometries.append((m, n))
    m, n = create_box([0.05, 2.32, 0.05], [8.40, 1.18, 0.36], mat_black_metal, "Balcony_Slider_MullionL")
    geometries.append((m, n))
    m, n = create_box([0.05, 2.32, 0.05], [8.40, 1.18, 2.54], mat_black_metal, "Balcony_Slider_MullionR")
    geometries.append((m, n))
    m, n = create_box([0.03, 0.20, 0.02], [8.37, 1.15, 0.46], mat_black_metal, "Balcony_Slider_Handle")
    geometries.append((m, n))

    # Panel 2: Fixed South Glazing Sash (Kitchen Boundary: Z = 2.53 to 4.75, Center = 3.64)
    m, n = create_box([0.025, 2.32, 2.22], [8.44, 1.18, 3.64], mat_glass, "Balcony_Fixed_Glass")
    geometries.append((m, n))
    m, n = create_box([0.05, 2.32, 0.05], [8.44, 1.18, 2.55], mat_black_metal, "Balcony_Fixed_Mullion")
    geometries.append((m, n))

    # Bedroom Window Glazing on West Wall (X = 0.0, Z = 3.8)
    m, n = create_box([0.02, 1.20, 1.20], [0.0, 1.50, 3.80], mat_glass, "Bed_Window_Glass")
    geometries.append((m, n))
    m, n = create_box([0.06, 1.20, 0.06], [0.0, 1.50, 3.22], mat_black_metal, "Bed_Window_FrameL")
    geometries.append((m, n))
    m, n = create_box([0.06, 1.20, 0.06], [0.0, 1.50, 4.38], mat_black_metal, "Bed_Window_FrameR")
    geometries.append((m, n))

    # 6. DOORS
    m, n = create_box([0.05, 2.08, 0.90], [0.15, 1.04, 0.78], mat_doors, "Door_MainEntry")
    geometries.append((m, n))
    m, n = create_box([0.04, 0.15, 0.02], [0.12, 1.00, 0.82], mat_brass, "Door_Handle_Main")
    geometries.append((m, n))

    m, n = create_box([0.80, 2.08, 0.04], [3.65, 1.04, 2.42], mat_doors, "Door_Bedroom")
    geometries.append((m, n))

    m, n = create_box([0.75, 2.08, 0.04], [5.525, 1.04, 2.42], mat_doors, "Door_Toilet")
    geometries.append((m, n))

    # 7. FURNITURE: LIVING ROOM LOUNGE
    # Sofa Base Frame elevated on sleek feet
    m, n = create_box([2.20, 0.32, 0.90], [2.70, 0.22, 0.75], mat_sofa_fabric, "Sofa_Base")
    geometries.append((m, n))
    m, n = create_box([2.20, 0.44, 0.22], [2.70, 0.60, 0.41], mat_sofa_fabric, "Sofa_Backrest")
    geometries.append((m, n))
    # Deep seat cushions
    m, n = create_box([0.96, 0.12, 0.65], [2.20, 0.42, 0.75], mat_sofa_fabric, "Sofa_Cushion_L")
    geometries.append((m, n))
    m, n = create_box([0.96, 0.12, 0.65], [3.20, 0.42, 0.75], mat_sofa_fabric, "Sofa_Cushion_R")
    geometries.append((m, n))
    m, n = create_box([0.18, 0.32, 0.86], [1.61, 0.52, 0.73], mat_sofa_fabric, "Sofa_ArmL")
    geometries.append((m, n))
    m, n = create_box([0.18, 0.32, 0.86], [3.79, 0.52, 0.73], mat_sofa_fabric, "Sofa_ArmR")
    geometries.append((m, n))

    # Accent Throw Pillows: Warm Burnt Ochre Velvet & Forest Sage
    m, n = create_box([0.38, 0.35, 0.10], [1.95, 0.56, 0.68], mat_sofa_cushion, "Cushion_Ochre_L")
    geometries.append((m, n))
    m, n = create_box([0.38, 0.35, 0.10], [3.45, 0.56, 0.68], mat_cushion_sage, "Cushion_Sage_R")
    geometries.append((m, n))

    # Sofa feet (matte black metal)
    for fx, fz in [(-1.0, -0.38), (1.0, -0.38), (-1.0, 0.38), (1.0, 0.38)]:
        m, n = create_box([0.05, 0.06, 0.05], [2.70 + fx, 0.03, 0.75 + fz], mat_black_metal, f"Sofa_Foot_{fx}_{fz}")
        geometries.append((m, n))

    # Designer 2-Tier Coffee Table (Honed Calacatta Marble top on Smoked Walnut base)
    m, n = create_box([1.10, 0.32, 0.55], [2.70, 0.16, 1.45], mat_walnut, "Coffee_Table")
    geometries.append((m, n))
    m, n = create_box([1.12, 0.04, 0.57], [2.70, 0.34, 1.45], mat_marble, "Coffee_Table_Top")
    geometries.append((m, n))

    # Lounge Armchair (Cognac Saddle Leather - Facing West towards Coffee Table & Sofa)
    m, n = create_box([0.70, 0.14, 0.70], [3.75, 0.28, 1.55], mat_chair_fabric, "Armchair_Seat")
    geometries.append((m, n))
    m, n = create_box([0.14, 0.44, 0.70], [4.05, 0.54, 1.55], mat_chair_fabric, "Armchair_Back")
    geometries.append((m, n))
    m, n = create_box([0.62, 0.22, 0.10], [3.75, 0.43, 1.22], mat_chair_fabric, "Armchair_Arm_N")
    geometries.append((m, n))
    m, n = create_box([0.62, 0.22, 0.10], [3.75, 0.43, 1.88], mat_chair_fabric, "Armchair_Arm_S")
    geometries.append((m, n))
    for ax, az in [(-0.28, -0.28), (0.28, -0.28), (-0.28, 0.28), (0.28, 0.28)]:
        m, n = create_box([0.04, 0.22, 0.04], [3.75 + ax, 0.11, 1.55 + az], mat_black_metal, f"Armchair_Leg_{ax}_{az}")
        geometries.append((m, n))

    # TV Floating Credenza & OLED Screen
    m, n = create_box([1.60, 0.42, 0.36], [2.10, 0.36, 2.22], mat_walnut, "TV_Console")
    geometries.append((m, n))
    m, n = create_box([1.25, 0.72, 0.03], [2.10, 1.35, 2.24], mat_black_metal, "TV_Screen")
    geometries.append((m, n))

    # 8. FURNITURE: ARCHITECTURAL DINING ENSEMBLE
    # Dining Table: Smoked Walnut Solid Slab with Black Tapered Steel Legs
    m, n = create_box([1.45, 0.045, 0.85], [6.40, 0.74, 1.15], mat_walnut, "Dining_Table_Top")
    geometries.append((m, n))
    for dx, dz in [(-0.62, -0.34), (0.62, -0.34), (-0.62, 0.34), (0.62, 0.34)]:
        m, n = create_box([0.05, 0.715, 0.05], [6.40 + dx, 0.3575, 1.15 + dz], mat_black_metal, f"Dining_Leg_{dx}_{dz}")
        geometries.append((m, n))

    # Scandinavian Inspired Dining Chairs (4 Chairs: Cognac Saddle Leather Upholstery & Matte Black Steel Legs)
    chair_configs = [
        # Side, Center X, Center Z, Back Z, Leg Zs
        ('N', -0.38, 0.65, 0.44, (0.50, 0.80)),
        ('N',  0.38, 0.65, 0.44, (0.50, 0.80)),
        ('S', -0.38, 1.65, 1.86, (1.50, 1.80)),
        ('S',  0.38, 1.65, 1.86, (1.50, 1.80))
    ]
    for side, cx, cz, bz, (lz1, lz2) in chair_configs:
        chair_x = 6.40 + cx
        prefix = f"Chair_{side}_{cx}"
        # 4 Slender Tapered Legs (Black Metal)
        for lx in (-0.17, 0.17):
            for lz in (lz1, lz2):
                m, n = create_box([0.03, 0.43, 0.03], [chair_x + lx, 0.215, lz], mat_black_metal, f"{prefix}_Leg_{lx}_{lz}")
                geometries.append((m, n))
        # Padded Seat Cushion (Cognac Saddle Leather)
        m, n = create_box([0.44, 0.06, 0.42], [chair_x, 0.45, cz], mat_chair_fabric, f"{prefix}_Seat")
        geometries.append((m, n))
        # Contoured Ergonomic Backrest Cushion (Cognac Saddle Leather)
        m, n = create_box([0.42, 0.26, 0.04], [chair_x, 0.68, bz], mat_chair_fabric, f"{prefix}_Back")
        geometries.append((m, n))
        # Backrest Black Steel Support Struts
        for sx in (-0.14, 0.14):
            m, n = create_box([0.02, 0.26, 0.02], [chair_x + sx, 0.58, bz], mat_black_metal, f"{prefix}_Strut_{sx}")
            geometries.append((m, n))

    # Designer Pendant Light over Dining Table (Brushed Brass)
    m, n = create_cylinder(0.18, 0.22, [6.40, 2.10, 1.15], mat_brass, "Dining_PendantLamp")
    geometries.append((m, n))
    m, n = create_cylinder(0.005, 0.65, [6.40, 2.50, 1.15], mat_black_metal, "Dining_PendantCord")
    geometries.append((m, n))

    # 9. KITCHEN APPLIANCES & CABINETRY
    m, n = create_box([0.75, 1.85, 0.75], [6.40, 0.925, 4.00], mat_appliance, "Appliance_Fridge")
    geometries.append((m, n))
    m, n = create_box([0.65, 0.85, 0.65], [6.35, 0.425, 2.95], mat_appliance, "Appliance_WashingMachine")
    geometries.append((m, n))

    # L-Shaped Kitchen Main Counter
    m, n = create_box([0.63, 0.88, 2.58], [8.06, 0.44, 3.79], mat_walnut, "Kitchen_Base_E")
    geometries.append((m, n))
    m, n = create_box([0.65, 0.04, 2.58], [8.06, 0.90, 3.79], mat_marble, "Kitchen_Counter_E")
    geometries.append((m, n))
    m, n = create_box([1.58, 0.88, 0.63], [7.27, 0.44, 4.76], mat_walnut, "Kitchen_Base_S")
    geometries.append((m, n))
    m, n = create_box([1.58, 0.04, 0.65], [7.27, 0.90, 4.76], mat_marble, "Kitchen_Counter_S")
    geometries.append((m, n))
    m, n = create_box([0.45, 0.20, 0.55], [8.05, 0.82, 3.30], mat_appliance, "Kitchen_Sink")
    geometries.append((m, n))
    m, n = create_cylinder(0.015, 0.35, [8.25, 1.05, 3.30], mat_brass, "Kitchen_Faucet")
    geometries.append((m, n))
    m, n = create_box([0.60, 0.02, 0.50], [7.30, 0.92, 4.75], mat_black_metal, "Kitchen_Cooktop")
    geometries.append((m, n))
    m, n = create_box([0.35, 0.80, 2.58], [8.20, 1.95, 3.79], mat_upper_cab, "Kitchen_WallCabinets")
    geometries.append((m, n))

    # 10. MASTER BEDROOM (Queen Bed, Nightstands, Wardrobe)
    mat_headboard = PBRMaterial(name="Mat_Headboard", baseColorFactor=[0.38, 0.34, 0.30, 1.0], roughnessFactor=0.92, metallicFactor=0.0)
    # Headboard Accent Wall Feature Panel (Nordic Sage Olive)
    m, n = create_box([2.40, 2.30, 0.02], [2.20, 1.25, 5.08], mat_wall_accent, "Bed_Wall_AccentPanel")
    geometries.append((m, n))
    m, n = create_box([1.80, 1.10, 0.10], [2.20, 0.55, 5.02], mat_headboard, "Bed_Headboard")
    geometries.append((m, n))
    m, n = create_box([1.65, 0.32, 2.05], [2.20, 0.16, 3.95], mat_walnut, "Bed_Base")
    geometries.append((m, n))
    m, n = create_box([1.60, 0.24, 2.00], [2.20, 0.44, 3.95], mat_bed_linen, "Bed_Mattress")
    geometries.append((m, n))
    # Layered Luxury Bedding: 2 White Sleeping Pillows (back) + 2 Burnt Ochre Velvet Cushions (front)
    m, n = create_box([0.68, 0.16, 0.32], [1.75, 0.60, 4.74], mat_bed_linen, "Bed_PillowWhiteL")
    geometries.append((m, n))
    m, n = create_box([0.68, 0.16, 0.32], [2.65, 0.60, 4.74], mat_bed_linen, "Bed_PillowWhiteR")
    geometries.append((m, n))
    m, n = create_box([0.48, 0.22, 0.12], [1.75, 0.64, 4.52], mat_sofa_cushion, "Bed_CushionOchreL")
    geometries.append((m, n))
    m, n = create_box([0.48, 0.22, 0.12], [2.65, 0.64, 4.52], mat_sofa_cushion, "Bed_CushionOchreR")
    geometries.append((m, n))
    # Terracotta rust throw blanket at foot of bed
    m, n = create_box([1.64, 0.04, 0.75], [2.20, 0.58, 3.35], mat_bed_throw, "Bed_ThrowBlanket")
    geometries.append((m, n))
    m, n = create_box([0.45, 0.45, 0.40], [1.05, 0.225, 4.85], mat_walnut, "Nightstand_L")
    geometries.append((m, n))
    m, n = create_box([0.45, 0.45, 0.40], [3.35, 0.225, 4.85], mat_walnut, "Nightstand_R")
    geometries.append((m, n))
    m, n = create_cylinder(0.12, 0.25, [1.05, 0.575, 4.85], mat_brass, "Lamp_L")
    geometries.append((m, n))
    m, n = create_cylinder(0.12, 0.25, [3.35, 0.575, 4.85], mat_brass, "Lamp_R")
    geometries.append((m, n))

    # Built-in Wardrobe (`WARDROBE` in PDF)
    m, n = create_box([0.58, 2.80, 2.08], [3.79, 1.40, 4.04], mat_walnut, "Wardrobe_BuiltIn")
    geometries.append((m, n))

    # 11. BATHROOM / TOILET FIXTURES
    m, n = create_box([0.70, 0.45, 0.45], [4.65, 0.62, 2.65], mat_walnut, "Vanity_Cabinet")
    geometries.append((m, n))
    m, n = create_box([0.50, 0.12, 0.38], [4.65, 0.88, 2.65], mat_ceramic, "Vanity_Sink")
    geometries.append((m, n))
    m, n = create_box([0.65, 0.75, 0.03], [4.65, 1.48, 2.45], mat_glass, "Vanity_Mirror")
    geometries.append((m, n))
    m, n = create_box([0.40, 0.42, 0.60], [5.60, 0.35, 3.90], mat_ceramic, "WC_Commode")
    geometries.append((m, n))
    m, n = create_box([0.90, 2.10, 0.02], [4.60, 1.05, 3.40], mat_glass, "Shower_GlassDivider")
    geometries.append((m, n))
    m, n = create_cylinder(0.10, 0.03, [4.40, 2.10, 3.80], mat_brass, "Shower_Head")
    geometries.append((m, n))

    # --- ADD TO TRIMESH SCENE ---
    for mesh, name in geometries:
        scene.add_geometry(mesh, node_name=name, geom_name=name)

    # --- EXPORT GLB ---
    glb_data = trimesh.exchange.gltf.export_glb(scene)
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "unit_3.glb")
    with open(output_path, "wb") as f:
        f.write(glb_data)

    print(f"Successfully generated {output_path}!")
    print(f"Total Geometries/Nodes: {len(geometries)}")
    print(f"GLB File Size: {len(glb_data):,} bytes ({len(glb_data)/1024:.1f} KB)")

if __name__ == "__main__":
    run()
