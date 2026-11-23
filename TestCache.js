function myCache() {
  let cache = CacheService.getScriptCache();
  let cached = cache.get("test");
  let other = cache.get("x")
  console.log(cached)
  console.log(other)
  if (cached === null) {  //Si ingreso datos en cache sin especificar el tiempo en segundos, ese par clave valor durara 10min
    cache.put("test", "joni")//21600s Tiempo maximo 
  }
  if (cached === "joni") {
    cache.remove("test")
  }
  let values = {
    'foo': 'bar',
    'x': 'y',
    'key': 'value'
  };
  cache.putAll(values);
}
