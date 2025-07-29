const db = require('../db/connection');

exports.getUserByMatricula = async (req, res) => {
  try {
    const { matricula } = req.params;

    const [rows] = await db.promise().query(
      'SELECT nombres, primer_apellido, avatar_accessories, avatar_base FROM alumnos WHERE matricula = ?',
      [matricula]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    let avatarConfig = null;

    if (rows[0].avatar_accessories) {
      try {
        avatarConfig = JSON.parse(rows[0].avatar_accessories);
      } catch (parseError) {
        console.error('Error al parsear el avatar:', parseError);
        avatarConfig = null;
      }
    }

    const userData = {
      nombres: rows[0].nombre,
      primer_apellido: rows[0].apellido,
      avatarBase: rows[0].avatar_base || 'leon',
      avatarConfig: avatarConfig
    };

    res.json(userData);
  } catch (error) {
    console.error('Error al obtener el usuario:', error);
    res.status(500).json({ error: 'Error al obtener el usuario' });
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

