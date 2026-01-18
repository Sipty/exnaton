# Exnaton homework assignment. 

## Task 1: Data Exploration
### Full details and analysis trace can be found in `data_exploration.ipynb`

From doing some basic internet sleuthing, I've came to the conclusion the hex values are OBIS codes. The description of which is explained above. The readings theory of active vs reactive energy tracks the most, as the percent of reactive energy is on average accurate against what the typical reactive energy is against active energy. In the real world, I would just go ask the provider/ or my fellow data science folk though. :)

- **Meter 1** (`0100011D00FF`): Active energy - the actual electricity being consumed (The beer you pay for)
- **Meter 2** (`0100021D00FF`): Reactive energy - the "phantom" power needed for magnetic fields in motors/transformers (The foam you don't pay for)

Sidenote - data is cool. But energy data is SO COOL! 

So, processing some more clues: energy heatmap for the start of the week (EARLY IN THE MORNING) is a crazy giveaway, when combined with the kwh numbers, that we're almost certainly looking at someone with a crazy consistent pattern, living in an appartment/ small house. The spikes are almost certainly related to them doing laundry. Also the low energy consumption friday evening is also a suggestion this user likes going out on those days, including sleeping in on saturday, hahaha.

Thinking about it further, I would go as far as to guess the person works on a hybrid schedule, where they usually go to office Tuesday/ Wednesday? Seems like their work day starts around 10 or so. And Wednesday they come back fairly early around 3? 

I just wish there was more data to try and get more trends from this. 

### The Verdict

We're looking at a **single person or couple in a small apartment/house** with:
- A consistent weekday routine (probably a hybrid work schedule with kid pickup responsibilities?)
- Regular laundry habits
- An active Friday night social calendar
- The self-respect to sleep in on Saturday and stay WAY TOO LATE on Sunday.


## Task 2: Backend

For the backend I went with a fairly simple architecture, but with a vision of scale and an ability for it to grow into complexity, as it is added in. 

To explain the decisions:
- Backend is based on FastAPI. I prefer using FastAPI for most of my CRUD applications since its good-enough. Previously I had one of the major contributors of Starlite working under me, so we tended to use that, but ONLY because the team was intimately familiar with the library. When doing things on my own, I prefer to work with the most popular tool out there, since it guarantees best-in-class support by the LLMs, with little compromises on speed/quality.

- DB is TimeseriesDB, which is based off of PostgresSQL. Based on the data, this is one of the best options. I've worked with InfluxDB in the past, but wanted to try this for the toy project. :) 

The DB itself is updated using a separate data_loader container, which is a simple Python app, fetching data from the source, massaging it lightly and upserting it into the DB. I went with this approach only to satisfy the requirement in the homework, asking me to treat S3 as an actual API. I've baked in a few comments explaining how the code would change, were it a real API I was playing with, with the assumption that data in the DB will be updated every 15~ minutes, so the schedule is on a 15 minute interval. In reality, this design would be heavily based on the real world requirements and will be informed by a lot of conversations/ design docs. 


