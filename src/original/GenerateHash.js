//A esta funcion se le pasa un texto y lo hashea en base al algoritmo que le pasamos, si no le pasamos un algoritmo usara SHA-256
function hashText(text, algorithm) {
  if (!algorithm) {
    console.log("No hay algoritmo")
    algorithm = "sha-256"
  }
  let digestAlgorithm;

  // Determinar el algoritmo de hash a utilizar
  switch (algorithm.toLowerCase()) {
    case 'sha-256':
      digestAlgorithm = Utilities.DigestAlgorithm.SHA_256;
      break;
    case 'sha-1':
      digestAlgorithm = Utilities.DigestAlgorithm.SHA_1;
      break;
    case 'md5':
      digestAlgorithm = Utilities.DigestAlgorithm.MD5;
      break;
    case 'sha-512':
      digestAlgorithm = Utilities.DigestAlgorithm.SHA_512;
      break;
    default:
      throw new Error('Algoritmo no soportado. Usa "SHA-256", "SHA-1", "MD5" o "SHA-512".');
  }

  // Calcular el hash
  const hashBytes = Utilities.computeDigest(digestAlgorithm, text);

  // Convertir el resultado a hexadecimal
  return hashBytes.map(byte => ('0' + (byte + 256).toString(16)).slice(-2)).join('');
}

//Esta funcion verifica que el hash sea valido, se le pasa el texto original, el hash y el algoritmo. Si no se especifica algoritmo entonces probara con todos los algoritmos disponibles y devolvera true o false
function isValidHash(text, hash, algorithm) {
  const algorithms = ['SHA-256', 'SHA-1', 'MD5', 'SHA-512'];

  // Si se proporciona un algoritmo, verifica solo con ese
  if (algorithm) {
    const computedHash = hashText(text, algorithm);
    return computedHash === hash;
  }

  // Si no se proporciona un algoritmo, verifica con todos
  for (const algo of algorithms) {
    const computedHash = hashText(text, algo);
    if (computedHash === hash) {
      return true; // Hash válido encontrado
    }
  }
  return false; // Ningún hash válido encontrado
}
