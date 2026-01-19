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

### Architecture
For the backend I went with a fairly simple architecture, but with a vision of scale and an ability for it to grow into complexity, as it is added in. 

To explain the decisions:
- Backend is based on FastAPI. I prefer using FastAPI for most of my CRUD applications since its good-enough. Previously I had one of the major contributors of Starlite working under me, so we tended to use that, but ONLY because the team was intimately familiar with the library. When doing things on my own, I prefer to work with the most popular tool out there, since it guarantees best-in-class support by the LLMs, with little compromises on speed/quality.

- DB is TimeseriesDB, which is an extension to PostgresSQL. Based on the data, this is one of the best options. Cassandra was another consideration, but considering both serve the same usecase, the main distinction came to Cassandra being better suited for high throughput streams. Considering the data entries were stored a few times PER HOUR, I went with the assumption we're not really cooking anything extreme. I am also assuming the data isn't going to be changed very often, as it is a timeseries DB.

The DB itself is updated using a separate data_loader container, which is a simple Python app, fetching data from the source, massaging it lightly and upserting it into the DB. I went with this approach only to satisfy the requirement in the homework, asking me to treat S3 as an actual API. I've baked in a few comments explaining how the code would change, were it a real API I was playing with, with the assumption that data in the DB will be updated every 15~ minutes, so the schedule is on a 15 minute interval. In reality, this design would be heavily based on the real world requirements and will be informed by a lot of conversations/ design docs. 

In terms of scalability - TimescaleDB comes with all the goodies of a NoSQL DB (replication, partitioning, sharding out the box) so we're chilling now and in the future. 

I gave myself the permission NOT to consider licenses, since I am having a lot of fun with this project and don't want to spoil it. 😇

Last thing to mention is regarding the data_loader - this is likely the weakest link in the whole architecture and TBH it can be optimized significantly by just using an off-the-shelf solution like Airflow or its offshoots. I decided against it for this project, simply because the data is so simple and the intake was so vaguely defined that I stayed on the side of caution and decided not to overengineer the assignment.

Fun note regarding the data_loader - I've used similar setups before for ingestion, where I've used pandas and have managed to achieve C-level processing speeds, hence why I decided to go with that approach here. If this was going in prod, I'd spend a lot more time understanding the ingestion and tidying up the Pandas code to get sub-second increases, but deemed it unnecessary for this specific assignment. 

### API
For the API I attempt to do as much of the heavy lifting as possible on the backend, with the idea of not overloading the frontend/ users devices. This does come at a cost, of course, so in real life we'd need to consider where should the load be and if we're ok with the bulk of the processing to happen on the frontend.

Another shortcut I've taken is not implementing rate limiting or any security measures, as I cosnidered them to be out of scope for this. 

We do get swagger docks for mostly free, which are available at /docs. I've done my best to document functions in as much detail as possible. I've not included a getting started page and similar crash-course-level entries, as I am going with the assumption that the front end devs would have access to the code, so they can deep-dive by reading the code itself.

Lastly, we make liberal use of the TimescaleDBs hypertable, allowing for optimized time series processing. This is the big reason behind my desire to do the table processing on the backend and if more info was needed, frontend engineers can either bake it into the backend direct or process it on the frontend. But considering Exnaton is a small company, I'm going with the assumption everyone can work on everything, despite specializations.