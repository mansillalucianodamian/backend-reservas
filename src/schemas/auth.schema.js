import Joi from 'joi';

export const registerSchema = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(50)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El nombre es requerido',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 50 caracteres',
      'string.pattern.base': 'El nombre solo puede contener letras y espacios'
    }),

  apellido: Joi.string()
    .min(2)
    .max(50)
    .required()
    .pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .messages({
      'string.empty': 'El apellido es requerido',
      'string.min': 'El apellido debe tener al menos 2 caracteres',
      'string.max': 'El apellido no puede tener más de 50 caracteres',
      'string.pattern.base': 'El apellido solo puede contener letras y espacios'
    }),

  dni: Joi.string()
    .min(7)
    .max(20)
    .required()
    .messages({
      'string.empty': 'El DNI es requerido'
    }),

  telefono: Joi.string()
    .min(6)
    .max(20)
    .required()
    .messages({
      'string.empty': 'El teléfono es requerido'
    }),

  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      'string.email': 'Email no válido',
      'string.empty': 'El email es requerido'
    }),

  password: Joi.string()
    .min(6)
    .max(30)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .messages({
      'string.empty': 'La contraseña es requerida',
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.max': 'La contraseña no puede tener más de 30 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    }),

  rol: Joi.string()
    .valid('super_admin', 'recepcionista', 'usuario')
    .default('usuario')
    .messages({
      'any.only': 'El rol debe ser super_admin, recepcionista o usuario'
    })
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .messages({
      'string.email': 'Email no válido',
      'string.empty': 'El email es requerido',
      'any.required': 'El email es requerido'
    }),

  password: Joi.string()
    .min(6)
    .max(30)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.max': 'La contraseña no puede tener más de 30 caracteres',
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    })
});
