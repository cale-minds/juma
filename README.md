# Juma R2RML

Juma, jigsaw puzzles for representing mapping, is a method that applies the block metaphor to mapping languages.

In this implementation, we have applied the Juma method to the W3C Recommendation [R2RML](https://www.w3.org/TR/r2rml/). 

## Using the code

Open index.html into a browser. 

## Ontology URL proxy

Published deployments on Vercel use the serverless function at `/api/ontology-proxy` automatically for ontology URL imports blocked by CORS.

For reliable local demos without public proxy limits, run:

```bash
node ontology-proxy-server.js
```

Then open `http://localhost:8787/index.html`, or keep using `index.html` from disk. The application will try direct access first, then the Juma proxy, and only then public demo proxies.

More information available at https://www.scss.tcd.ie/~crottija/juma/ .

## License
Code written by Ademar Crotti Junior.

This study is supported by CNPQ, National Counsel of Technological and Scientific Development – Brazil and the Science Foundation Ireland [ADAPT Centre](https://www.adaptcentre.ie/) for Digital Content Technology (Grant 13/RC/2106) and released under the [MIT license](http://opensource.org/licenses/MIT).

## Publications

[1]  Crotti Junior, A., Debruyne, C., O’Sullivan, D.: Juma: an Editor that Uses a Block Metaphor to Facilitate the Creation and Editing of R2RML Mappings. In: The Semantic Web - Latest Advances and New Domains (ESWC 2017).

[2] Crotti Junior, A., Debruyne, C., O’Sullivan, D.: Using a Block Metaphor for Representing R2RML Mappings. In: Proceedings of the 3rd International Workshop on Visualization and Interaction for Ontologies and Linked Data co-located with the 16th International Semantic Web Conference (VOILA@ISWC 2017).
