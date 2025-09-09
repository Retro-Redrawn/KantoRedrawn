#!/usr/bin/env bash

# Convert Windows paths to Unix style if needed
convert_path() {
    echo "$1" | sed 's/\\/\//g'
}

# Check for ImageMagick
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it first:"
    echo "Windows (with Chocolatey): choco install imagemagick"
    echo "Or download from: https://imagemagick.org/script/download.php#windows"
    exit 1
fi

# Find all files that begin with 'areas' and end with .js
shopt -s nullglob
area_files=(areas*.js)

if [ ${#area_files[@]} -eq 0 ]; then
    echo "No files matching areas*.js found in current directory."
    exit 0
fi

echo "Found ${#area_files[@]} areas file(s):"
for f in "${area_files[@]}"; do echo "  - $f"; done
echo

for file in "${area_files[@]}"; do
    echo "----"
    echo "Processing $file"

    # Prompt user for image folder for this specific areas file
    while true; do
        read -e -p "Enter image folder path for '$file' (or type 'skip' to skip this file): " user_input
        # allow empty to reprompt
        if [ -z "$user_input" ]; then
            echo "Please provide a path or type 'skip'."
            continue
        fi
        if [ "$user_input" = "skip" ]; then
            echo "Skipping $file"
            break
        fi
        IMAGE_PATH=$(convert_path "$user_input")
        if [ -d "$IMAGE_PATH" ]; then
            echo "Using image folder: $IMAGE_PATH"
            break
        else
            echo "Directory '$IMAGE_PATH' does not exist. Try again or type 'skip'."
        fi
    done

    # If user chose to skip, continue to next file
    if [ "$user_input" = "skip" ]; then
        continue
    fi

    # Backup original
    cp "$file" "${file}.backup"
    echo "Backup created: ${file}.backup"

    # Create temporary file for processing
    temp_file=$(mktemp)

    # First pass: insert width/height after point.y using magick to get dimensions
    awk -v img_path="$IMAGE_PATH" -v src_file="$file" '
        BEGIN {
            in_area = 0
            in_point = 0
            skip_wh = 0
            current_ident = ""
        }

        # Start of an area object (assumes object starts with "{")
        /^ *\{/ {
            in_area = 1
            print
            next
        }

        # Capture the ident when we find it
        /ident[[:space:]]*:/ && in_area {
            # extract string between quotes
            if (match($0, /"([^"]+)"/, arr)) {
                current_ident = arr[1]
            } else {
                current_ident = ""
            }
            print
            next
        }

        # When we find point: {, prepare to modify
        /point[[:space:]]*:[[:space:]]*\{/ && in_area {
            in_point = 1
            skip_wh = 0
            print
            next
        }

        # After y coordinate in point block, add width and height, and start skipping any old width/height
        /y[[:space:]]*:/ && in_point {
            # Add comma to y line if it doesnt have one
            if ($0 !~ /,$/) {
                sub(/$/, ",")
            }
            print
            # Get image dimensions using magick; fallback to 0x0 on failure
            cmd = "magick identify -format \"%wx%h\" \"" img_path "/" current_ident ".png\" 2>/dev/null"
            dimensions = ""
            if ((cmd | getline dimensions) > 0) {
                split(dimensions, dim, "x")
                printf "      width: %d,\n", (dim[1] + 0)
                printf "      height: %d\n", (dim[2] + 0)
            } else {
                printf "      width: 0,\n"
                printf "      height: 0\n"
            }
            close(cmd)
            # From now on, skip any existing width/height lines inside this point block
            skip_wh = 1
            next
        }

        # If skipping is active, drop any existing width/height lines
        in_point && skip_wh && /^[[:space:]]*width[[:space:]]*:/ { next }
        in_point && skip_wh && /^[[:space:]]*height[[:space:]]*:/ { next }

        # End of point block (assumes closing brace at same indent)
        /^ *\}/ && in_point {
            in_point = 0
            skip_wh = 0
            print
            next
        }

        # End of area object
        /^ *\},?$/ && in_area {
            in_area = 0
            in_point = 0
            skip_wh = 0
            print
            next
        }

        # Print all other lines unchanged
        { print }
    ' "$file" > "$temp_file"

    mv "$temp_file" "$file"

    # Second pass: keep simple (prior heuristic preserved)
    temp_file=$(mktemp)
    awk '
        BEGIN { in_array=0 }
        # detect start of top-level array (heuristic: line containing "var " and "[" )
        /^[[:space:]]*var[[:space:]].*[[:space:]]=\s*\[/ { in_array=1; print; next }
        # detect end of array
        /^[[:space:]]*\];/ { in_array=0; print; next }
        {
            print
        }
    ' "$file" > "$temp_file"
    mv "$temp_file" "$file"

    echo "Finished $file (backup at ${file}.backup)"
done

echo "All done."
