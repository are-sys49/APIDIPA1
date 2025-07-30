const db = require('../db/connection');

exports.getUserByMatricula = async (req, res) => {
  try {
    const { matricula } = req.params;

    const [rows] = await db.promise().query(
      `SELECT 
        a.nombres, 
        a.primer_apellido,
        a.segundo_apellido,
        v.imagen_png,
        v.nombre_imagen,
        v.accessory
      FROM alumnos a
      LEFT JOIN avatar v ON a.id_avatar = v.id_avatar
      WHERE a.matricula = ?`,
      [matricula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const avatarConfig = rows[0].accessory ? { accessory: rows[0].accessory } : null;
    const avatarBase = rows[0].nombre_imagen || null;

    const userData = {
      nombres: rows[0].nombres,
      primer_apellido: rows[0].primer_apellido,
      avatarBase: avatarBase || 'LeonSimple',
      avatarConfig: avatarConfig
    };

    res.json(userData);
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
  }
};
exports.getAvatarByAlumno = async (req, res) => {
  try {
    const { alumnoId } = req.params;
    
    // Query para obtener el avatar del alumno
    const query = `
      SELECT 
        a.id_avatar as avatar_id,
        a.imagen_png,
        a.accessory,
        a.fecha_creacion as created_at,
        al.nombres,
        al.primer_apellido
      FROM avatars a
      INNER JOIN alumnos al ON a.id_alumno = al.id
      WHERE a.id_alumno = ?
      ORDER BY a.fecha_creacion DESC
      LIMIT 1
    `;
    
    const [rows] = await db.execute(query, [alumnoId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró avatar para este usuario'
      });
    }
    
    const avatar = rows[0];
    
    res.json({
      success: true,
      data: {
        avatarId: avatar.avatar_id,
        imagenPng: avatar.imagen_png,
        accessory: avatar.accessory,
        createdAt: avatar.created_at,
        alumno: {
          nombres: avatar.nombres,
          apellido: avatar.primer_apellido
        }
      }
    });
    
  } catch (error) {
    console.error('Error al obtener avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};




exports.updateAvatar = async (req, res) => {
  try {
    const { matricula, avatarConfig, imagen_png, nombre_imagen } = req.body;

    if (!matricula || !avatarConfig || !imagen_png || !nombre_imagen) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Buscar alumno y su id_avatar actual
    const [user] = await db.promise().query(
      'SELECT id_alumno, id_avatar FROM alumnos WHERE matricula = ?',
      [matricula]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userId = user[0].id_alumno;
    const currentAvatarId = user[0].id_avatar;

    if (currentAvatarId) {
      // Actualizar avatar existente
      await db.promise().query(
        `UPDATE avatar 
         SET imagen_png = ?, nombre_imagen = ?, accessory = ?
         WHERE id_avatar = ?`,
        [Buffer.from(imagen_png, 'base64'), nombre_imagen, avatarConfig.accessory, currentAvatarId]
      );
    } else {
      // Insertar nuevo avatar
      const [insertResult] = await db.promise().query(
        `INSERT INTO avatar (imagen_png, nombre_imagen, accessory, id_alumno)
         VALUES (?, ?, ?, ?)`,
        [Buffer.from(imagen_png, 'base64'), nombre_imagen, avatarConfig.accessory, userId]
      );
      // Actualizar id_avatar en alumnos
      await db.promise().query(
        'UPDATE alumnos SET id_avatar = ? WHERE id_alumno = ?',
        [insertResult.insertId, userId]
      );
    }

    res.json({ success: true, message: 'Avatar actualizado correctamente' });

  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ error: 'Error al guardar avatar' });
  }
};


