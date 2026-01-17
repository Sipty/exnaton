# Exnaton Coding Challenge

The following challenge is designed to resemble many of the tasks we work on at Exnaton on a daily basis. During the challenge you will work with energy data and how to display it to the user and/or other developers in an understandable manner. You'll be working with an fictive API, retrieve energy data and expose it.

## The "API"

The data that you will be working with can be retrieved from here:

- [95ce3367-cbce-4a4d-bbe3-da082831d7bd.json](https://exnaton-public-s3-bucket20230329123331528000000001.s3.eu-central-1.amazonaws.com/challenge/95ce3367-cbce-4a4d-bbe3-da082831d7bd.json)
- [1db7649e-9342-4e04-97c7-f0ebb88ed1f8.json](https://exnaton-public-s3-bucket20230329123331528000000001.s3.eu-central-1.amazonaws.com/challenge/1db7649e-9342-4e04-97c7-f0ebb88ed1f8.json)

The data for both files was retrieved with requests to our API:

```
GET /meterdata/measurement
```

The parameters for the first file were:
```
muid=95ce3367-cbce-4a4d-bbe3-da082831d7bd&measurement=energy&limit=5000&start=2023-02-01&stop=2023-03-01
```

The parameters for the second file were:
```
muid=1db7649e-9342-4e04-97c7-f0ebb88ed1f8&measurement=energy&limit=5000&start=2023-02-01&stop=2023-03-01
```

While the links that you will be working against only return a raw JSON file, we ask you treat it as if it were a full-fledged API.

## Task A - Data Exploration

Explore the data and group it by different time intervals. Explain what you see/what the data represents. Come up with a hypothesis on what kind of data you are looking at.

**Bonus:** Check for any autocorrelation within the time-series data.

## Task B - Backend

Please retrieve the data from the GET endpoint and store it in a database of your choice. Write an endpoint to access the data from a frontend application. Which kind of query parameters might be useful to access the data from the frontend? Document your API for your fellow frontend developer.

## Task C - Frontend

Build a front-end application using a technology of your choice:

- Access and load the data stored at the "API" or the one in your database via REST/GraphQL/… to load it into your front-end application
- Visualize the time-series data in your application

**Bonus:** Add some form of analytical tool to your front-end application

## Task D - Deployment 

How would you deploy your application? Prepare the corresponding dockerfiles, kubernetes resource definitions, and whatever else you see fit. Notice that we'll want to serve multiple tenants. How could this be accommodated in the app/deployment?

Formulate some assumptions about the performance characteristics of your application; which parts will become bottlenecks first? How could you mitigate those bottlenecks?

---

Please prepare your solution before our next interview. Feel free to pick any technology that you are comfortable with or that you want to explore. Depending on where you see yourself working in the future feel free to put more emphasis on either the backend or frontend.

During the interview we will take about half an hour to go through your solution together. Please be ready to talk us through your solution. We will not only consider if you solved the problem at hand. Instead, we are more interested in how you solved it, i.e. how you structured, documented and presented your solution.

**Best of luck!**