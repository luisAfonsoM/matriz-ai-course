import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Gera um hash seguro a partir de uma palavra-passe em texto limpo.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara uma palavra-passe em texto limpo com o hash armazenado na base de dados.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
