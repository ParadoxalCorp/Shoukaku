# Shoukaku 

Named after the [Imperial Japanese Navy's Aircraft carrier Shoukaku](https://en.wikipedia.org/wiki/Japanese_aircraft_carrier_Sh%C5%8Dkaku), Shoukaku is 
the request handler server for Felix. As the single-threaded nature of JavaScript forced Felix to be split in multiple processes while shared memory isn't yet possible, Shoukaku has been designed as a central place to handle requests to external services (like whatanime.ga for example). Because the said external services have implemented rate-limits to prevent spam, Shoukaku act as a middle-man between Felix and external services to keep track of how many requests are made and thus avoid being rate-limited.

The way requests are handled in the initial release `1.0.0` is heavily based on [Taihou](https://github.com/ParadoxalCorp/Taihou)'s request handler, this being why Shoukaku as been chosen as the name for this request handler
