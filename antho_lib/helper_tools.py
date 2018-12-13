#!/usr/bin/env python3

import os


def get_file_paths_from_dir(input_folder):
    """
    :param input_folder: str
    :return: file_paths : list
    """
    file_paths = list()
    for path, sub_dirs, file_names in os.walk(input_folder):
        for filename in file_names:
            if filename.endswith("xml"):
                file_paths.append(os.path.join(path, filename))
    file_paths.sort()

    return file_paths
