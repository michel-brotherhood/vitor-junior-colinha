// Leitor mínimo de .zip (só o que o consulta_cand_*.zip do TSE precisa): lê o diretório central e
// descomprime entradas "stored" (0) ou "deflate" (8) com zlib. Sem dependências.
import { inflateRawSync } from 'node:zlib';

export function listarZip(buf) {
  // Procura o registro de fim do diretório central (EOCD) a partir do fim do arquivo.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Arquivo .zip inválido (sem diretório central)');
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const itens = [];
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Diretório central corrompido');
    const metodo = buf.readUInt16LE(p + 10), tamComp = buf.readUInt32LE(p + 20), tamOrig = buf.readUInt32LE(p + 24);
    const nNome = buf.readUInt16LE(p + 28), nExtra = buf.readUInt16LE(p + 30), nCom = buf.readUInt16LE(p + 32);
    const offLocal = buf.readUInt32LE(p + 42);
    const nome = buf.subarray(p + 46, p + 46 + nNome).toString('utf8');
    if (tamComp === 0xffffffff || tamOrig === 0xffffffff || offLocal === 0xffffffff) throw new Error('ZIP64 não suportado');
    itens.push({ nome, metodo, tamComp, tamOrig, offLocal });
    p += 46 + nNome + nExtra + nCom;
  }
  return itens;
}

export function lerEntrada(buf, item) {
  const p = item.offLocal;
  if (buf.readUInt32LE(p) !== 0x04034b50) throw new Error(`Cabeçalho local inválido: ${item.nome}`);
  const ini = p + 30 + buf.readUInt16LE(p + 26) + buf.readUInt16LE(p + 28);
  const dados = buf.subarray(ini, ini + item.tamComp);
  if (item.metodo === 0) return Buffer.from(dados);
  if (item.metodo === 8) return inflateRawSync(dados);
  throw new Error(`Método de compressão ${item.metodo} não suportado (${item.nome})`);
}
