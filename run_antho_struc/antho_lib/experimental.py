#!/usr/bin/env python3

import numpy as np
import matplotlib.pyplot as plt
import umap


def umap_analysis(booktable):

    data = np.array(booktable.iloc[:, 20:23])
    vecs = umap.UMAP(min_dist=0.6,
                     metric="canberra",
                     n_components=2,
                     n_neighbors=80).fit_transform(data)

    fig, ax = plt.subplots(figsize=(15, 15))

    scatter = plt.scatter(vecs[:, 0], vecs[:, 1], size=5, alpha=0.6, c="red")

    plt.savefig("umap.png", bbox_inches="tight", format="png")
